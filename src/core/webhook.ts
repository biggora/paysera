import type { PayseraWebhookEvent } from './types.js';

export class PayseraWebhookVerificationUnavailableError extends Error {
  constructor() {
    super(
      'Paysera Checkout V3 webhook signature verification is not implemented because the public documentation does not expose a stable signature algorithm.',
    );
    this.name = 'PayseraWebhookVerificationUnavailableError';
  }
}

export function parseWebhookEvent<TPayload = unknown>(
  rawBody: Buffer | string,
): PayseraWebhookEvent<TPayload> {
  const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
  const parsed = JSON.parse(text) as PayseraWebhookEvent<TPayload>;

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError('Paysera webhook payload must be a JSON object.');
  }

  return parsed;
}

export function verifyWebhookPayload(
  _rawBody?: Buffer | string,
  _signature?: string,
  _secret?: string,
): never {
  throw new PayseraWebhookVerificationUnavailableError();
}
