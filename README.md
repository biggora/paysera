# @biggora/paysera

[![npm version](https://img.shields.io/npm/v/@biggora/paysera.svg)](https://www.npmjs.com/package/@biggora/paysera)
[![Unit Tests](https://github.com/biggora/paysera/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/biggora/paysera/actions/workflows/unit-tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript SDK and NestJS adapter for Paysera Checkout V3.

Targets Node.js `20+`. Ships dual `ESM`/`CommonJS` builds and a first-class NestJS subpath export.

## Install

```bash
npm install @biggora/paysera
```

NestJS apps also need peer deps:

```bash
npm install @nestjs/common @nestjs/core reflect-metadata rxjs
```

## Quick Start: Checkout

```ts
import { createPayseraClient } from '@biggora/paysera';

const paysera = createPayseraClient({
  clientId: process.env.PAYSERA_CLIENT_ID!,
  clientSecret: process.env.PAYSERA_CLIENT_SECRET!,
});
```

Use `baseUrl` and `tokenUrl` when Paysera gives environment-specific endpoints:

```ts
const paysera = createPayseraClient({
  clientId: process.env.PAYSERA_CLIENT_ID!,
  clientSecret: process.env.PAYSERA_CLIENT_SECRET!,
  baseUrl: process.env.PAYSERA_BASE_URL,
  tokenUrl: process.env.PAYSERA_TOKEN_URL,
});
```

## Orders

```ts
const order = await paysera.orders.create({
  order_id: 'order-1001',
  amount: {
    amount: '10.00',
    currency: 'EUR',
  },
  success_url: 'https://shop.example/checkout/success',
  cancel_url: 'https://shop.example/checkout/cancel',
  webhook_url: 'https://shop.example/paysera/webhook',
});

console.log(order.checkout_url ?? order.payment_url ?? order.redirect_url);

const sameOrder = await paysera.orders.read(order.id!);
```

## Payments And Refunds

```ts
const payment = await paysera.payments.read('payment-id');

const refund = await paysera.refunds.create({
  payment_id: payment.id,
  amount: {
    amount: '10.00',
    currency: 'EUR',
  },
});

const sameRefund = await paysera.refunds.read(refund.id!);
```

## Webhooks

Checkout V3 webhook signature verification is intentionally not guessed. Current Paysera public docs expose Checkout V3 webhooks, but do not expose a stable signature algorithm on the public page used for this SDK. Use `parseWebhookEvent` for typed raw-body parsing until Paysera documents signature headers and algorithm.

Register a webhook once per environment when you do not set `webhook_url` per order:

```ts
await paysera.webhooks.create({
  url: 'https://shop.example/paysera/webhook',
  events: ['payment.captured', 'payment.failed', 'refund.succeeded'],
});
```

```ts
import { parseWebhookEvent } from '@biggora/paysera';

export async function handlePayseraWebhook(rawBody: Buffer) {
  const event = parseWebhookEvent(rawBody);

  if (event.event_type === 'payment.captured') {
    // update order state from event.data
  }

  return 'OK';
}
```

## NestJS

```ts
import { Module } from '@nestjs/common';
import { PayseraModule } from '@biggora/paysera/nestjs';

@Module({
  imports: [
    PayseraModule.forRoot({
      clientId: process.env.PAYSERA_CLIENT_ID!,
      clientSecret: process.env.PAYSERA_CLIENT_SECRET!,
      baseUrl: process.env.PAYSERA_BASE_URL,
      tokenUrl: process.env.PAYSERA_TOKEN_URL,
    }),
  ],
})
export class AppModule {}
```

Async config keeps credentials in your existing config service:

```ts
PayseraModule.forRootAsync({
  useFactory: async () => ({
    clientId: process.env.PAYSERA_CLIENT_ID!,
    clientSecret: process.env.PAYSERA_CLIENT_SECRET!,
    baseUrl: process.env.PAYSERA_BASE_URL,
    tokenUrl: process.env.PAYSERA_TOKEN_URL,
  }),
});
```

```ts
import { Controller, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { InjectPayseraClient, PayseraWebhookVerifier } from '@biggora/paysera/nestjs';
import type { PayseraClient } from '@biggora/paysera';

@Controller('paysera')
export class PayseraController {
  constructor(
    @InjectPayseraClient() private readonly paysera: PayseraClient,
    private readonly webhooks: PayseraWebhookVerifier,
  ) {}

  @Post('webhook')
  handleWebhook(@Req() req: RawBodyRequest<Request>) {
    return this.webhooks.parse(req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {})));
  }
}
```

Enable raw body before registering webhook routes:

```ts
const app = await NestFactory.create(AppModule, { rawBody: true });
```

## Scripts

```bash
npm test
npm run typecheck
npm run build
```
