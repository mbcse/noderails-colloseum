import type { HttpClient } from "../http";
import type { CheckoutSession } from "../types/checkout-session";
import type {
  HeadlessCheckoutCreateParams,
  HeadlessConfirmParams,
  HeadlessConfirmResult,
  HeadlessPaymentOptions,
  HeadlessPrepareParams,
  HeadlessPrepareResult,
  HeadlessSubmitUserTxParams,
  HeadlessSubmitUserTxResult,
} from "../types/headless-checkout";

export class HeadlessCheckout {
  constructor(
    private readonly http: HttpClient,
    private readonly appId: string,
  ) {}

  /**
   * Create a checkout session for headless (your own UI) payment.
   * Do not redirect to pay.noderails.com. Call paymentOptions next.
   */
  async create(params: HeadlessCheckoutCreateParams): Promise<CheckoutSession> {
    return this.http.request<CheckoutSession>({
      method: "POST",
      path: "/checkout-sessions",
      body: { appId: this.appId, ...params } as unknown as Record<string, unknown>,
    });
  }

  /**
   * Create a checkout session for the first charge of a subscription.
   * Use after subscriptions.create. Then call paymentOptions.
   */
  async createFromSubscription(subscriptionId: string): Promise<CheckoutSession> {
    return this.http.request<CheckoutSession>({
      method: "POST",
      path: `/subscriptions/${subscriptionId}/checkout`,
    });
  }

  /**
   * List accepted chains and tokens, with a spot quote per token.
   */
  async paymentOptions(sessionId: string): Promise<HeadlessPaymentOptions> {
    return this.http.request<HeadlessPaymentOptions>({
      method: "GET",
      path: `/checkout-sessions/${sessionId}/payment-options`,
    });
  }

  /**
   * Quote the selected token and return the wallet userAction
   * (permit typed data, approve tx, or later capture).
   */
  async prepare(sessionId: string, params: HeadlessPrepareParams): Promise<HeadlessPrepareResult> {
    return this.http.request<HeadlessPrepareResult>({
      method: "POST",
      path: `/checkout-sessions/${sessionId}/prepare`,
      body: params as unknown as Record<string, unknown>,
    });
  }

  /**
   * Authorize and capture when NodeRails can pull funds.
   * Native / Solana / Sui one-time pays return AWAITING_USER_TX plus captureData.
   */
  async confirm(sessionId: string, params: HeadlessConfirmParams): Promise<HeadlessConfirmResult> {
    return this.http.request<HeadlessConfirmResult>({
      method: "POST",
      path: `/checkout-sessions/${sessionId}/confirm`,
      body: params as unknown as Record<string, unknown>,
    });
  }

  /**
   * Report the customer capture tx after confirm returns AWAITING_USER_TX.
   */
  async submitUserTx(
    sessionId: string,
    params: HeadlessSubmitUserTxParams,
  ): Promise<HeadlessSubmitUserTxResult> {
    return this.http.request<HeadlessSubmitUserTxResult>({
      method: "POST",
      path: `/checkout-sessions/${sessionId}/submit-user-tx`,
      body: params as unknown as Record<string, unknown>,
    });
  }
}
