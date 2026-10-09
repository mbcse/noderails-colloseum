import type {
  AllowedChains,
  AllowedTokens,
  AuthorizationMethod,
  CaptureMode,
  Metadata,
  PaginationParams,
  PaymentSourceType,
  PaymentStatus,
} from "./common";

// ─── Response Types ──────────────────────────────────────────────────

export interface PaymentIntent {
  id: string;
  appId: string;
  customerAccountId: string | null;
  externalId: string | null;
  amount: string;
  currency: string;
  allowedChains: AllowedChains;
  allowedTokens: AllowedTokens;
  captureMode: CaptureMode;
  timelockDuration: number;
  disputeStartDuration: number;
  status: PaymentStatus;
  authorizationMethod: AuthorizationMethod | null;
  authorizationChainId: number | null;
  authorizationTokenKey: string | null;
  authorizationWalletAddress: string | null;
  authorizationTxHash: string | null;
  authorizedAt: string | null;
  cryptoAmount: string | null;
  cryptoTokenKey: string | null;
  cryptoTokenDecimals: number | null;
  exchangeRate: string | null;
  captureTxHash: string | null;
  capturedAt: string | null;
  captureAttempts: number;
  timelockEndsAt: string | null;
  settledAt: string | null;
  refundedAt: string | null;
  refundTxHash: string | null;
  refundReason: string | null;
  /** Leftover escrow token units still in the contract (integer string). */
  settleAmount: string | null;
  promisedSettlementAmount?: string | null;
  platformFeeBps: number | null;
  /** Present on retrieve / list. */
  refunds?: PaymentRefund[];
  transactions?: PaymentIntentTransaction[];
  expiresAt: string | null;
  sourceType: PaymentSourceType | null;
  sourceId: string | null;
  successUrl: string | null;
  cancelUrl: string | null;
  metadata: Metadata | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Request Types ───────────────────────────────────────────────────

export interface PaymentIntentCreateParams {
  customerAccountId?: string;
  externalId?: string;
  amount: string;
  currency?: string;
  allowedChains?: AllowedChains;
  allowedTokens?: AllowedTokens;
  captureMode?: CaptureMode;
  metadata?: Metadata;
  successUrl?: string;
  cancelUrl?: string;
  idempotencyKey?: string;
}

export interface PaymentIntentListParams extends PaginationParams {
  appId?: string;
  status?: PaymentStatus;
}

export interface PaymentRefund {
  id: string;
  amount: string;
  reason: string | null;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  createdAt: string;
  confirmedAt: string | null;
  transactionId: string | null;
}

export interface PaymentIntentTransaction {
  id: string;
  paymentIntentId: string | null;
  mtxmTxId: string | null;
  txHash: string | null;
  chain: string;
  type: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  blockNumber: number | null;
  gasUsed: string | null;
  error: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface PaymentIntentRefundParams {
  reason: string;
  /**
   * Integer string of escrow token units to refund.
   * Omit together with `percent` to refund all leftover.
   * Do not send with `percent`.
   */
  amount?: string;
  /**
   * Percent of current leftover (1–100).
   * Do not send with `amount`. Partial refunds are EVM only.
   */
  percent?: number;
}

/** POST /payments/intents/:id/refund — submitted refund, not yet confirmed on-chain. */
export interface PaymentIntentRefund {
  paymentIntentId: string;
  transactionId: string;
  mtxmTxId: string;
  txHash: string | null;
  status: "PENDING";
  amount: string;
  leftoverAfter: string;
}
