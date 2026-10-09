import type { HttpClient, PaginatedResult } from "../http";
import type {
  PaymentIntent,
  PaymentIntentCreateParams,
  PaymentIntentListParams,
  PaymentIntentRefund,
  PaymentIntentRefundParams,
} from "../types/payment-intent";

export class PaymentIntents {
  constructor(
    private readonly http: HttpClient,
    private readonly appId: string,
  ) {}

  /**
   * Create a new payment intent.
   * The `appId` is automatically set from your SDK config.
   *
   * @example
   * ```ts
   * const intent = await noderails.paymentIntents.create({
   *   amount: '100.00',
   *   currency: 'USD',
   * });
   * ```
   */
  async create(params: PaymentIntentCreateParams): Promise<PaymentIntent> {
    return this.http.request<PaymentIntent>({
      method: "POST",
      path: "/payments/intents",
      body: { appId: this.appId, ...params } as unknown as Record<string, unknown>,
    });
  }

  /**
   * Retrieve a payment intent by ID.
   */
  async retrieve(id: string): Promise<PaymentIntent> {
    return this.http.request<PaymentIntent>({
      method: "GET",
      path: `/payments/intents/${id}`,
    });
  }

  /**
   * List payment intents with pagination.
   */
  async list(params?: PaymentIntentListParams): Promise<PaginatedResult<PaymentIntent>> {
    return this.http.requestPaginated<PaymentIntent>({
      method: "GET",
      path: "/payments/intents",
      query: { appId: this.appId, ...params } as Record<string, string | number | boolean | undefined>,
    });
  }

  /**
   * Cancel a payment intent.
   */
  async cancel(id: string): Promise<PaymentIntent> {
    return this.http.request<PaymentIntent>({
      method: "POST",
      path: `/payments/intents/${id}/cancel`,
    });
  }

  /**
   * Refund leftover escrow to the payer. Allowed while `CAPTURED` or
   * `PARTIALLY_REFUNDED` and before the settlement timelock.
   *
   * Omit `amount` and `percent` to refund all leftover. Partial refunds are
   * EVM only; Solana/Sui must refund the remaining amount in full.
   *
   * @example
   * ```ts
   * await noderails.paymentIntents.refund('intent-id', { reason: 'Customer request' });
   * await noderails.paymentIntents.refund('intent-id', { reason: 'Partial', percent: 50 });
   * await noderails.paymentIntents.refund('intent-id', { reason: 'Partial', amount: '5000000' });
   * ```
   */
  async refund(id: string, params: PaymentIntentRefundParams): Promise<PaymentIntentRefund> {
    return this.http.request<PaymentIntentRefund>({
      method: "POST",
      path: `/payments/intents/${id}/refund`,
      body: params as unknown as Record<string, unknown>,
    });
  }
}
