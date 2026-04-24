import { PayseraApiError, createPayseraApiError, createPayseraRequestError } from './error.js';
import type { QueryRecord } from './types.js';

export type FetchRequestInput = string | URL | Request;
export type FetchLike = (input: FetchRequestInput, init?: RequestInit) => Promise<Response>;

export type PayseraClientOptions = {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  tokenUrl?: string;
  timeoutMs?: number;
  fetch?: FetchLike;
};

export type RequestOptions<TBody = unknown> = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path?: string | undefined;
  absoluteUrl?: string | undefined;
  query?: QueryRecord | undefined;
  body?: TBody | undefined;
  signal?: AbortSignal | undefined;
  skipAuth?: boolean | undefined;
};

type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

export class HttpClient {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly baseUrl: string;
  readonly tokenUrl: string;
  readonly timeoutMs: number;
  private cachedToken: CachedToken | undefined;
  private tokenRequest: Promise<CachedToken> | undefined;
  private readonly fetchImpl: FetchLike;

  constructor(options: PayseraClientOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.baseUrl = ensureTrailingSlash(options.baseUrl ?? 'https://api.paysera.com/checkout/v3/');
    this.tokenUrl = options.tokenUrl ?? 'https://api.paysera.com/oauth/token';
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async request<TResponse, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const combinedSignal = options.signal
      ? AbortSignal.any([controller.signal, options.signal])
      : controller.signal;

    try {
      const init: RequestInit = {
        method: options.method,
        headers: await this.buildHeaders(options.body, options.skipAuth ?? false),
        signal: combinedSignal,
      };
      if (options.body !== undefined) {
        init.body = JSON.stringify(options.body);
      }

      const response = await this.fetchImpl(this.buildUrl(options), init);

      if (!response.ok) {
        throw await createPayseraApiError(response);
      }

      if (response.status === 204) {
        return undefined as TResponse;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        return undefined as TResponse;
      }

      return await response.json() as TResponse;
    } catch (error) {
      throw error instanceof PayseraApiError ? error : createPayseraRequestError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 30_000) {
      return this.cachedToken.accessToken;
    }

    this.tokenRequest ??= this.fetchAccessToken();
    try {
      this.cachedToken = await this.tokenRequest;
      return this.cachedToken.accessToken;
    } finally {
      this.tokenRequest = undefined;
    }
  }

  clearAccessToken(): void {
    this.cachedToken = undefined;
    this.tokenRequest = undefined;
  }

  private async fetchAccessToken(): Promise<CachedToken> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });
      const response = await this.fetchImpl(this.tokenUrl, {
        method: 'POST',
        headers: new Headers({
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        }),
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await createPayseraApiError(response);
      }

      const token = await response.json() as TokenResponse;
      if (!token.access_token) {
        throw new PayseraApiError('Paysera OAuth token response did not include access_token.', {
          code: 'invalid_token_response',
          raw: token,
        });
      }

      return {
        accessToken: token.access_token,
        expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
      };
    } catch (error) {
      throw error instanceof PayseraApiError ? error : createPayseraRequestError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(options: RequestOptions<unknown>): URL {
    const url = options.absoluteUrl
      ? new URL(options.absoluteUrl)
      : new URL(stripLeadingSlash(options.path ?? ''), this.baseUrl);

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const entry of value) {
          url.searchParams.append(key, String(entry));
        }
        continue;
      }

      url.searchParams.set(key, String(value));
    }

    return url;
  }

  private async buildHeaders(body: unknown, skipAuth: boolean): Promise<Headers> {
    const headers = new Headers({
      accept: 'application/json',
    });

    if (!skipAuth) {
      headers.set('authorization', `Bearer ${await this.getAccessToken()}`);
    }

    if (body !== undefined) {
      headers.set('content-type', 'application/json');
    }

    return headers;
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function stripLeadingSlash(value: string): string {
  return value.startsWith('/') ? value.slice(1) : value;
}
