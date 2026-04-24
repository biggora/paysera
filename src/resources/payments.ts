import type { HttpClient } from '../core/http-client.js';
import type { JsonRecord, PayseraList, PayseraPayment, QueryRecord } from '../core/types.js';

export type CapturePayseraPayment = JsonRecord;

export class PaymentsResource {
  constructor(private readonly httpClient: HttpClient) {}

  list(query?: QueryRecord): Promise<PayseraList<PayseraPayment>> {
    return this.httpClient.request({
      method: 'GET',
      path: '/payments',
      query,
    });
  }

  read(id: string): Promise<PayseraPayment> {
    return this.httpClient.request({
      method: 'GET',
      path: `/payments/${encodeURIComponent(id)}`,
    });
  }

  capture(id: string, body?: CapturePayseraPayment): Promise<PayseraPayment> {
    return this.httpClient.request({
      method: 'POST',
      path: `/payments/${encodeURIComponent(id)}/capture`,
      body,
    });
  }

  cancel(id: string): Promise<PayseraPayment> {
    return this.httpClient.request({
      method: 'POST',
      path: `/payments/${encodeURIComponent(id)}/cancel`,
    });
  }
}
