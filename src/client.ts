import type { PayseraClientOptions, RequestOptions } from './core/http-client.js';
import { HttpClient } from './core/http-client.js';
import { OrdersResource } from './resources/orders.js';
import { PaymentsResource } from './resources/payments.js';
import { RefundsResource } from './resources/refunds.js';
import { WebhooksResource } from './resources/webhooks.js';

export class PayseraClient {
  readonly orders: OrdersResource;
  readonly payments: PaymentsResource;
  readonly refunds: RefundsResource;
  readonly webhooks: WebhooksResource;
  private readonly httpClient: HttpClient;

  constructor(options: PayseraClientOptions) {
    this.httpClient = new HttpClient(options);
    this.orders = new OrdersResource(this.httpClient);
    this.payments = new PaymentsResource(this.httpClient);
    this.refunds = new RefundsResource(this.httpClient);
    this.webhooks = new WebhooksResource(this.httpClient);
  }

  getAccessToken(): Promise<string> {
    return this.httpClient.getAccessToken();
  }

  clearAccessToken(): void {
    this.httpClient.clearAccessToken();
  }

  request<TResponse, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse> {
    return this.httpClient.request<TResponse, TBody>(options);
  }
}

export function createPayseraClient(options: PayseraClientOptions): PayseraClient {
  return new PayseraClient(options);
}
