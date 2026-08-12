export type PayseraApiErrorOptions = {
  status?: number | undefined;
  code?: string | undefined;
  details?: unknown;
  raw?: unknown;
  requestId?: string | null | undefined;
  cause?: unknown;
};

export class PayseraApiError extends Error {
  status: number | undefined;
  code: string | undefined;
  details: unknown;
  raw: unknown;
  requestId: string | null | undefined;

  constructor(message: string, options: PayseraApiErrorOptions = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'PayseraApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.raw = options.raw;
    this.requestId = options.requestId;
  }
}

type ErrorRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ErrorRecord {
  return typeof value === 'object' && value !== null;
}

function pickString(record: ErrorRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function pickNestedError(record: ErrorRecord): ErrorRecord | undefined {
  const nested = record.error;
  return isRecord(nested) ? nested : undefined;
}

export async function createPayseraApiError(response: Response): Promise<PayseraApiError> {
  const requestId = response.headers.get('x-request-id') ?? response.headers.get('request-id');
  const contentType = response.headers.get('content-type') ?? '';
  let raw: unknown;

  if (contentType.includes('application/json')) {
    raw = await response.json();
  } else {
    const text = await response.text();
    raw = text.length > 0 ? text : undefined;
  }

  const record = isRecord(raw) ? raw : undefined;
  const nested = record ? pickNestedError(record) : undefined;
  const source = nested ?? record;
  const message = source
    ? pickString(source, ['error_description', 'message', 'detail', 'description', 'error'])
    : undefined;
  const code = source ? pickString(source, ['error', 'code', 'error_code']) : undefined;
  const details = record?.errors ?? record?.details ?? nested?.details ?? raw;

  return new PayseraApiError(message ?? response.statusText ?? 'Paysera API request failed.', {
    status: response.status,
    code,
    details,
    raw,
    requestId,
  });
}

export function createPayseraRequestError(error: unknown): PayseraApiError {
  if (error instanceof PayseraApiError) {
    return error;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new PayseraApiError('Paysera API request timed out.', {
      code: 'request_timeout',
      cause: error,
    });
  }

  return new PayseraApiError(
    error instanceof Error ? error.message : 'Paysera API request failed.',
    {
      code: 'network_error',
      cause: error,
    },
  );
}
