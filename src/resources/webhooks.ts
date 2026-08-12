import type { HttpClient } from '../core/http-client.js';
import type { JsonRecord, PayseraList, PayseraWebhook, QueryRecord } from '../core/types.js';

export type CreatePayseraWebhook = JsonRecord;
export type UpdatePayseraWebhook = JsonRecord;

export class WebhooksResource {
  constructor(private readonly httpClient: HttpClient) {}

  create(body: CreatePayseraWebhook): Promise<PayseraWebhook> {
    return this.httpClient.request({
      method: 'POST',
      path: '/webhooks',
      body,
    });
  }

  list(query?: QueryRecord): Promise<PayseraList<PayseraWebhook>> {
    return this.httpClient.request({
      method: 'GET',
      path: '/webhooks',
      query,
    });
  }

  read(id: string): Promise<PayseraWebhook> {
    return this.httpClient.request({
      method: 'GET',
      path: `/webhooks/${encodeURIComponent(id)}`,
    });
  }

  update(id: string, body: UpdatePayseraWebhook): Promise<PayseraWebhook> {
    return this.httpClient.request({
      method: 'PATCH',
      path: `/webhooks/${encodeURIComponent(id)}`,
      body,
    });
  }

  delete(id: string): Promise<void> {
    return this.httpClient.request({
      method: 'DELETE',
      path: `/webhooks/${encodeURIComponent(id)}`,
    });
  }
}
