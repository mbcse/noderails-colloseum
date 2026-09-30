import { getFullnodeUrl } from '@mysten/sui/client';

const SUI_CHAIN_RPC: Record<number, string> = {
  201: getFullnodeUrl('devnet'),
  202: getFullnodeUrl('testnet'),
  203: getFullnodeUrl('mainnet'),
};

/** Resolve Sui JSON-RPC URL for checkout (browser + server). */
export function resolveSuiBrowserRpcUrl(
  chainId: number,
  configuredRpcUrl?: string | null,
): string {
  const configured = configuredRpcUrl?.trim();
  if (configured) return configured;
  return SUI_CHAIN_RPC[chainId] || getFullnodeUrl('devnet');
}

export function resolveSuiUpstreamRpcUrl(chainId: number): string {
  return SUI_CHAIN_RPC[chainId] || getFullnodeUrl('devnet');
}
