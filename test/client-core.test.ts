import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  PayseraApiError,
  PayseraWebhookVerificationUnavailableError,
  createPayseraClient,
  parseWebhookEvent,
  verifyWebhookPayload,
} from '../src/index.js';
import type { FetchRequestInput } from '../src/core/http-client.js';

function createJsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('PayseraClient core behavior', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('requests OAuth token and adds bearer authorization header', async () => {
    const fetchMock = vi.fn(async (input: FetchRequestInput, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/oauth/token')) {
        expect(init?.method).toBe('POST');
        expect(init?.body).toBeInstanceOf(URLSearchParams);
        return createJsonResponse({
          access_token: 'token-1',
          expires_in: 3600,
        });
      }

      return createJsonResponse({ id: 'order-1' });
    });

    const client = createPayseraClient({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      baseUrl: 'https://paysera.test/api/',
      tokenUrl: 'https://paysera.test/oauth/token',
      fetch: fetchMock,
    });

    await client.orders.create({
      order_id: 'order-1',
      amount: { amount: '10.00', currency: 'EUR' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const apiCall = fetchMock.mock.calls[1];
    if (!apiCall) {
      throw new Error('Expected API call.');
    }

    const [input, init] = apiCall;
    const headers = new Headers(init?.headers);

    expect(String(input)).toBe('https://paysera.test/api/orders');
    expect(init?.method).toBe('POST');
    expect(headers.get('authorization')).toBe('Bearer token-1');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('reuses bearer token until it expires', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async (input: FetchRequestInput) => {
      if (String(input).endsWith('/oauth/token')) {
        return createJsonResponse({
          access_token: `token-${fetchMock.mock.calls.length}`,
          expires_in: 60,
        });
      }

      return createJsonResponse({ id: 'order-1' });
    });

    const client = createPayseraClient({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      baseUrl: 'https://paysera.test/api/',
      tokenUrl: 'https://paysera.test/oauth/token',
      fetch: fetchMock,
    });

    await client.orders.read('order-1');
    await client.orders.read('order-2');
    vi.advanceTimersByTime(31_000);
    await client.orders.read('order-3');

    const tokenCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith('/oauth/token'),
    );
    expect(tokenCalls).toHaveLength(2);
  });

  it('normalizes Paysera API errors', async () => {
    const fetchMock = vi.fn(async (input: FetchRequestInput) => {
      if (String(input).endsWith('/oauth/token')) {
        return createJsonResponse({
          access_token: 'token-1',
          expires_in: 3600,
        });
      }

      return createJsonResponse(
        {
          error: 'invalid_parameters',
          error_description: 'Amount is required',
        },
        { status: 400 },
      );
    });

    const client = createPayseraClient({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      baseUrl: 'https://paysera.test/api/',
      tokenUrl: 'https://paysera.test/oauth/token',
      fetch: fetchMock,
    });

    await expect(client.orders.read('order-1')).rejects.toMatchObject({
      name: 'PayseraApiError',
      status: 400,
      code: 'invalid_parameters',
      message: 'Amount is required',
    } satisfies Partial<PayseraApiError>);
  });

  it('normalizes request timeout errors', async () => {
    const fetchMock = vi.fn(
      async (_input: FetchRequestInput, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const client = createPayseraClient({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      timeoutMs: 10,
      fetch: fetchMock,
    });

    await expect(client.getAccessToken()).rejects.toMatchObject({
      name: 'PayseraApiError',
      code: 'request_timeout',
    } satisfies Partial<PayseraApiError>);
  });
});

describe('Paysera webhook utilities', () => {
  it('parses raw webhook JSON payload', () => {
    const event = parseWebhookEvent(Buffer.from(JSON.stringify({
      id: 'evt-1',
      event_type: 'payment.captured',
      data: { payment_id: 'payment-1' },
    })));

    expect(event).toEqual({
      id: 'evt-1',
      event_type: 'payment.captured',
      data: { payment_id: 'payment-1' },
    });
  });

  it('does not fake webhook signature verification without documented algorithm', () => {
    expect(() => verifyWebhookPayload()).toThrow(PayseraWebhookVerificationUnavailableError);
  });
});
