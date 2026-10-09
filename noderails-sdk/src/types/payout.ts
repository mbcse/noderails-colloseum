import type { PaginationParams } from "./common";

export type PayoutStatus = "PENDING" | "SCHEDULED" | "EXECUTED" | "FAILED" | "CANCELLED";
export type PayoutScheduleStatus = "ACTIVE" | "PAUSED" | "CANCELLED";
export type PayoutFamily = "EVM" | "SOLANA" | "SUI";

export interface PayoutLine {
  recipient: string;
  /** Human decimals on create. Atomic integer string on stored intents. */
  amount: string;
}

export interface PayoutIntent {
  id: string;
  appId: string;
  chain: string;
  tokenAddress: string;
  recipientWallet: string;
  /** Atomic integer string (smallest token unit). */
  tokenAmount: string;
  /** Line amounts are atomic integer strings. */
  lines: PayoutLine[] | null;
  amountUsd: string;
  status: PayoutStatus;
  scheduledAt: string | null;
  scheduleId: string | null;
  txHash: string | null;
  error: string | null;
  merchantWallet: string;
  feeBps?: number;
  createdAt: string;
  executedAt: string | null;
}

export interface PayoutCreateParams {
  chain: string;
  tokenAddress: string;
  /** Human amounts. Required unless recipientWallet + tokenAmount are set. */
  lines?: PayoutLine[];
  /** Single-recipient shortcut (human amount). */
  recipientWallet?: string;
  tokenAmount?: string;
  amountUsd?: string;
  scheduledAt?: string;
  executeNow?: boolean;
}

export interface PayoutExecuteParams {
  merchantManagerAddress?: string;
  chainId?: string;
}

export interface PayoutListParams extends PaginationParams {
  status?: PayoutStatus;
}

export interface PayoutExecuteResult {
  id: string;
  mtxmTxId?: string | null;
  txHash?: string | null;
  chain?: string;
  status?: string;
}

export interface PayoutSchedule {
  id: string;
  appId: string;
  chain: string;
  tokenAddress: string;
  lines: PayoutLine[];
  intervalDays: number;
  nextRunAt: string;
  status: PayoutScheduleStatus;
  lastError: string | null;
  createdAt: string;
}

export interface PayoutScheduleCreateParams {
  chain: string;
  tokenAddress: string;
  lines: PayoutLine[];
  intervalDays: number;
  startAt?: string;
}

export interface PayoutScheduleListParams extends PaginationParams {
  status?: PayoutScheduleStatus;
}

export interface PayoutContact {
  id: string;
  appId: string;
  label: string;
  wallet: string;
  family: PayoutFamily;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutContactCreateParams {
  label: string;
  wallet: string;
  family: PayoutFamily;
}

export interface PayoutContactUpdateParams {
  label?: string;
  wallet?: string;
  family?: PayoutFamily;
}

export interface PayoutContactListParams extends PaginationParams {
  family?: PayoutFamily;
}

export interface PayoutContactImportParams {
  csv: string;
  family: PayoutFamily;
  saveToAddressBook?: boolean;
}

export interface PayoutContactImportResult {
  lines: Array<{ label: string; wallet: string; amount?: string }>;
  contactsSaved: number;
  errors: Array<{ row: number; message: string }>;
}
