# @biggora/paysera

[![npm version](https://img.shields.io/npm/v/@biggora/paysera.svg)](https://www.npmjs.com/package/@biggora/paysera)
[![Unit Tests](https://github.com/biggora/paysera/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/biggora/paysera/actions/workflows/unit-tests.yml)

TypeScript SDK and NestJS adapter for Paysera Checkout V3.

## Install

```bash
npm install @biggora/paysera
```

## Create Client

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

## Scripts

```bash
npm test
npm run typecheck
npm run build
```
