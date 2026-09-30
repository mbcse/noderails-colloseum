// Checkout balance reads now go through noderails-server /balance (BPC proxy)
// via useCheckoutBalance in checkout-hooks.ts. This module only keeps the
// coin-type resolution helper used by Sui signing/subscription flows.

import { SUI_NATIVE_COIN_TYPE, isNativeToken } from '@noderails/common';

export function resolveSuiCoinType(contractAddress: string): string {
  if (isNativeToken(contractAddress)) {
    return SUI_NATIVE_COIN_TYPE;
  }
  return contractAddress.trim();
}
