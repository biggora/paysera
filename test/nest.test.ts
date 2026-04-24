import 'reflect-metadata';

import { Controller, Inject, Post, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { RawBodyRequest } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Request } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import type { PayseraClient } from '../src/index.js';
import {
  InjectPayseraClient,
  PAYSERA_CLIENT,
  PayseraModule,
  PayseraWebhookVerifier,
} from '../src/nest/index.js';

class DirectInjectService {
  constructor(@Inject(PAYSERA_CLIENT) readonly client: PayseraClient) {}
}

class DecoratorInjectService {
  constructor(@InjectPayseraClient() readonly client: PayseraClient) {}
}

@Controller('webhooks')
class WebhookController {
  constructor(@Inject(PayseraWebhookVerifier) private readonly verifier: PayseraWebhookVerifier) {}

  @Post()
  handle(@Req() req: RawBodyRequest<Request>) {
    const payload = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    return this.verifier.parse(payload);
  }
}

describe('Paysera NestJS integration', () => {
  it('registers PAYSERA_CLIENT through forRoot', async () => {
    const fetchMock = async () =>
      new Response(JSON.stringify({ access_token: 'token-1', expires_in: 3600 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const moduleRef = await Test.createTestingModule({
      imports: [
        PayseraModule.forRoot({
          clientId: 'client-id',
          clientSecret: 'client-secret',
          fetch: fetchMock,
        }),
      ],
      providers: [DirectInjectService, DecoratorInjectService],
    }).compile();

    const direct = moduleRef.get(DirectInjectService);
    const decorated = moduleRef.get(DecoratorInjectService);

    expect(direct.client).toBeDefined();
    expect(decorated.client).toBe(direct.client);
  });

  it('builds client through forRootAsync factory', async () => {
    const fetchMock = async () =>
      new Response(JSON.stringify({ access_token: 'token-1', expires_in: 3600 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const moduleRef = await Test.createTestingModule({
      imports: [
        PayseraModule.forRootAsync({
          useFactory: async () => ({
            clientId: 'client-id',
            clientSecret: 'client-secret',
            fetch: fetchMock,
          }),
        }),
      ],
    }).compile();

    const client = moduleRef.get<PayseraClient>(PAYSERA_CLIENT);
    expect(client).toBeDefined();
    expect(client.orders).toBeDefined();
  });

  it('parses webhook payload inside Nest controller', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PayseraModule.forRoot({
          clientId: 'client-id',
          clientSecret: 'client-secret',
          fetch: async () =>
            new Response(JSON.stringify({ access_token: 'token-1', expires_in: 3600 }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
        }),
      ],
      controllers: [WebhookController],
    }).compile();

    const app = moduleRef.createNestApplication<NestExpressApplication>(
      new ExpressAdapter(),
      { rawBody: true },
    );
    await app.init();

    await request(app.getHttpServer())
      .post('/webhooks')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ id: 'evt-1', event_type: 'payment.captured' }))
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({
          id: 'evt-1',
          event_type: 'payment.captured',
        });
      });

    await app.close();
  });
});
