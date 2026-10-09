import type {
  CursorPaginationParams,
  Metadata,
  PaymentStatus,
  WebhookDeliveryStatus,
  WebhookEvent,
} from "./common";

// ─── Response Types ──────────────────────────────────────────────────

export interface WebhookEndpoint {
  id: string;
  appId: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  paymentIntentId: string | null;
  event: string;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  attempts: number;
  status: WebhookDeliveryStatus;
  nextRetryAt: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

// ─── Request Types ───────────────────────────────────────────────────

export interface WebhookEndpointCreateParams {
  url: string;
  events: WebhookEvent[];
}

export interface WebhookEndpointUpdateParams {
  url?: string;
  events?: WebhookEvent[];
  active?: boolean;
}

export interface WebhookDeliveryListParams extends CursorPaginationParams {
  status?: WebhookDeliveryStatus;
}

/** Payload for payment.* webhook events (including payment.refunded). */
export interface PaymentWebhookPayload {
  event: WebhookEvent | string;
  paymentIntentId: string;
  externalId: string | null;
  appId: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  settleAmount: string | null;
  /** True only when leftover escrow is zero (`REFUNDED`). */
  fullyRefunded: boolean;
  metadata: Metadata;
  createdAt: string;
}
