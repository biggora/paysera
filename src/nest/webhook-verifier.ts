import { Injectable } from '@nestjs/common';

import type { PayseraWebhookEvent } from '../core/types.js';
import { parseWebhookEvent, verifyWebhookPayload } from '../core/webhook.js';

@Injectable()
export class PayseraWebhookVerifier {
  parse<TPayload = unknown>(rawBody: Buffer | string): PayseraWebhookEvent<TPayload> {
    return parseWebhookEvent<TPayload>(rawBody);
  }

  verify(rawBody: Buffer | string, signature: string, secret?: string): never {
    return verifyWebhookPayload(rawBody, signature, secret);
  }
}
