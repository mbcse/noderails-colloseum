import type { BillingInterval, CheckoutMode, CheckoutSessionStatus } from "./common";
import type { CheckoutSessionCreateParams } from "./checkout-session";

export interface HeadlessCheckoutCreateParams extends CheckoutSessionCreateParams {}

export interface HeadlessTokenQuote {
  cryptoAmount: string;
  exchangeRate: string;
}

export interface HeadlessAcceptedToken {
  symbol: string;
  name: string;
  decimals: number;
  tokenKey: string;
  contractAddress: string;
  chainId: number;
  iconUrl: string | null;
  isStablecoin: boolean;
  supportsPermit: boolean;
  permitVersion: string | null;
  quote: HeadlessTokenQuote | null;
}

export interface HeadlessAcceptedChain {
  chainId: number;
  chainType: "EVM" | "SOLANA" | "SUI";
  name: string;
  displayName: string;
  nativeCurrencySymbol: string;
  iconUrl: string | null;
  isTestnet: boolean;
  escrowAddress: string | null;
  settlementAddress: string | null;
  escrowConfigObjectId: string | null;
  paymentRegistryObjectId: string | null;
  walletRegistryObjectId: string | null;
}

export interface HeadlessPaymentOptions {
  id: string;
  status: CheckoutSessionStatus;
  mode: CheckoutMode;
  amount: number;
  currency: string;
  requireBillingDetails: boolean;
  conversionEnabled: boolean;
  targetTokenKey: string | null;
  acceptedChains: HeadlessAcceptedChain[];
  acceptedTokens: HeadlessAcceptedToken[];
}

export interface HeadlessPrepareParams {
  tokenKey: string;
  chainId: number;
  walletAddress: string;
}

export interface HeadlessPermitTypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    Permit: Array<{ name: string; type: string }>;
  };
  primaryType: "Permit";
  message: {
    owner: string;
    spender: string;
    value: string;
    nonce: string;
    deadline: string;
  };
}

export type HeadlessUserAction =
  | { type: "permit"; typedData: HeadlessPermitTypedData }
  | { type: "approve"; to: string; data: string; spender: string; amount: string }
  | { type: "native_capture" }
  | { type: "solana_capture" }
  | { type: "sui_capture" }
  | {
      type: "sui_wallet_setup";
      walletSetup: {
        tokenContractAddress: string;
        merchantAddress: string;
        remainingBudget: string;
        maxPerCharge: string;
        expiresAtMs: string;
      };
    };

export interface HeadlessPrepareResult {
  sessionId: string;
  mode: CheckoutMode;
  chainId: number;
  walletAddress: string;
  token: {
    tokenKey: string;
    symbol: string;
    decimals: number;
    contractAddress: string;
    supportsPermit: boolean;
  };
  cryptoAmount: string;
  exchangeRate: string;
  quoteId: string | null;
  escrowAddress: string;
  authAmount: string;
  chargeAmount: string;
  billingInterval: BillingInterval | null;
  userAction: HeadlessUserAction;
}

export interface HeadlessPermitSignature {
  amount: string;
  deadline: string;
  v: number;
  r: string;
  s: string;
}

export interface HeadlessConfirmParams {
  walletAddress: string;
  chainId: number;
  tokenKey: string;
  customerEmail: string;
  cryptoAmount: string;
  exchangeRate: string;
  quoteId?: string;
  permitSignature?: HeadlessPermitSignature;
  approvalTxHash?: string;
  customerName?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  billingPostalCode?: string;
}

export type HeadlessConfirmResult =
  | { status: "CAPTURING"; intentId: string; transactionId: string }
  | { status: "AWAITING_USER_TX"; intentId: string; captureData: Record<string, unknown> };

export interface HeadlessSubmitUserTxParams {
  intentId: string;
  txHash?: string;
  suiSponsored?: {
    userSignature?: string;
    transactionBlockBase64: string;
    sponsorSignature: string;
    mtxmChainId: string;
    packageId: string;
    dualSignRequired?: boolean;
  };
}

export interface HeadlessSubmitUserTxResult {
  transactionId: string;
  txHash: string;
}
