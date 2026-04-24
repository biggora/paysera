export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;

export type QueryPrimitive = string | number | boolean;
export type QueryValue = QueryPrimitive | QueryPrimitive[] | null | undefined;
export type QueryRecord = Record<string, QueryValue>;

export type PayseraList<TItem = JsonRecord> = {
  data?: TItem[];
  items?: TItem[];
  results?: TItem[];
  next?: string | null;
  [key: string]: unknown;
};

export type PayseraMoney = {
  amount: string;
  currency: string;
};

export type PayseraOrderStatus =
  | 'created'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'canceled'
  | 'expired'
  | string;

export type PayseraPaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'canceled'
  | string;

export type PayseraRefundStatus = 'pending' | 'succeeded' | 'failed' | 'canceled' | string;

export type PayseraOrder = JsonRecord & {
  id?: string;
  status?: PayseraOrderStatus;
  amount?: PayseraMoney;
  checkout_url?: string;
};

export type PayseraPayment = JsonRecord & {
  id?: string;
  order_id?: string;
  status?: PayseraPaymentStatus;
  amount?: PayseraMoney;
};

export type PayseraRefund = JsonRecord & {
  id?: string;
  payment_id?: string;
  status?: PayseraRefundStatus;
  amount?: PayseraMoney;
};

export type PayseraWebhook = JsonRecord & {
  id?: string;
  url?: string;
  event_types?: string[];
};

export type PayseraWebhookEvent<TPayload = unknown> = {
  id?: string;
  type?: string;
  event_type?: string;
  created_at?: string;
  data?: TPayload;
  payload?: TPayload;
  [key: string]: unknown;
};
