import type { HttpClient } from '../core/http-client.js';
import type { JsonRecord, PayseraList, PayseraOrder, QueryRecord } from '../core/types.js';

export type CreatePayseraOrder = JsonRecord;
export type UpdatePayseraOrder = JsonRecord;

export class OrdersResource {
  constructor(private readonly httpClient: HttpClient) {}

  create(body: CreatePayseraOrder): Promise<PayseraOrder> {
    return this.httpClient.request({
      method: 'POST',
      path: '/orders',
      body,
    });
  }

  list(query?: QueryRecord): Promise<PayseraList<PayseraOrder>> {
    return this.httpClient.request({
      method: 'GET',
      path: '/orders',
      query,
    });
  }

  read(id: string): Promise<PayseraOrder> {
    return this.httpClient.request({
      method: 'GET',
      path: `/orders/${encodeURIComponent(id)}`,
    });
  }

  update(id: string, body: UpdatePayseraOrder): Promise<PayseraOrder> {
    return this.httpClient.request({
      method: 'PATCH',
      path: `/orders/${encodeURIComponent(id)}`,
      body,
    });
  }

  cancel(id: string): Promise<PayseraOrder> {
    return this.httpClient.request({
      method: 'POST',
      path: `/orders/${encodeURIComponent(id)}/cancel`,
    });
  }
}
