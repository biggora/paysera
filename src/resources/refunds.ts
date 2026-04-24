import type { HttpClient } from '../core/http-client.js';
import type { JsonRecord, PayseraList, PayseraRefund, QueryRecord } from '../core/types.js';

export type CreatePayseraRefund = JsonRecord;

export class RefundsResource {
  constructor(private readonly httpClient: HttpClient) {}

  create(body: CreatePayseraRefund): Promise<PayseraRefund> {
    return this.httpClient.request({
      method: 'POST',
      path: '/refunds',
      body,
    });
  }

  list(query?: QueryRecord): Promise<PayseraList<PayseraRefund>> {
    return this.httpClient.request({
      method: 'GET',
      path: '/refunds',
      query,
    });
  }

  read(id: string): Promise<PayseraRefund> {
    return this.httpClient.request({
      method: 'GET',
      path: `/refunds/${encodeURIComponent(id)}`,
    });
  }

  cancel(id: string): Promise<PayseraRefund> {
    return this.httpClient.request({
      method: 'POST',
      path: `/refunds/${encodeURIComponent(id)}/cancel`,
    });
  }
}
