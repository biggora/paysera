import { describe, expect, it, vi } from 'vitest';

import { createPayseraClient } from '../src';
import type { FetchRequestInput } from '../src';

describe('Paysera resource routing', () => {
  it('routes Checkout V3 resources to stable resource paths', async () => {
    const calls: Array<{ url: URL; method: string; body: string | undefined }> = [];
    const fetchMock = vi.fn(async (input: FetchRequestInput, init?: RequestInit) => {
      if (String(input).endsWith('/oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'token-1', expires_in: 3600 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      calls.push({
        url: new URL(String(input)),
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? init.body : undefined,
      });

      return new Response(JSON.stringify({ id: 'resource-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const client = createPayseraClient({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      baseUrl: 'https://paysera.test/api/',
      tokenUrl: 'https://paysera.test/oauth/token',
      fetch: fetchMock,
    });

    await client.orders.create({ amount: { amount: '10.00', currency: 'EUR' } });
    await client.orders.list({ limit: 10, status: ['created', 'paid'] });
    await client.orders.read('order 1');
    await client.orders.cancel('order-1');
    await client.payments.read('payment-1');
    await client.payments.capture('payment-1', { amount: { amount: '10.00', currency: 'EUR' } });
    await client.refunds.create({ payment_id: 'payment-1' });
    await client.refunds.read('refund-1');
    await client.webhooks.create({ url: 'https://shop.test/paysera/webhook' });
    await client.webhooks.delete('webhook-1');

    expect(calls.map(({ url, method }) => `${method} ${url.pathname}`)).toEqual([
      'POST /api/orders',
      'GET /api/orders',
      'GET /api/orders/order%201',
      'POST /api/orders/order-1/cancel',
      'GET /api/payments/payment-1',
      'POST /api/payments/payment-1/capture',
      'POST /api/refunds',
      'GET /api/refunds/refund-1',
      'POST /api/webhooks',
      'DELETE /api/webhooks/webhook-1',
    ]);
    expect(calls[1]?.url.searchParams.get('limit')).toBe('10');
    expect(calls[1]?.url.searchParams.getAll('status')).toEqual(['created', 'paid']);
  });
});
