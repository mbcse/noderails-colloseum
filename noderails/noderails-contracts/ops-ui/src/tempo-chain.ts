import { resolveForgeExecutable, withFoundryPath } from './foundry-path.js';

/** Tempo mainnet (4217) and Moderato testnet (42431). Fees are TIP-20, not native gas. */

export const TEMPO_MAINNET_CHAIN_ID = 4217;
export const TEMPO_TESTNET_CHAIN_ID = 42431;

const TEMPO_CHAIN_IDS = new Set([TEMPO_MAINNET_CHAIN_ID, TEMPO_TESTNET_CHAIN_ID]);

/** Default pathUSD-style fee tokens from chains.json (override in Deploy UI). */
export const TEMPO_DEFAULT_FEE_TOKEN: Record<number, string> = {
  [TEMPO_TESTNET_CHAIN_ID]: '0x20c0000000000000000000000000000000000002',
  [TEMPO_MAINNET_CHAIN_ID]: '0x20c0000000000000000000000000000000000000',
};

export const TEMPO_VERIFIER_URL = 'https://contracts.tempo.xyz';

/** Official RPC endpoints (Tempo docs). Prefer these over chainlist aliases. */
export const TEMPO_OFFICIAL_RPC: Record<number, string> = {
  [TEMPO_TESTNET_CHAIN_ID]: 'https://rpc.moderato.tempo.xyz',
  [TEMPO_MAINNET_CHAIN_ID]: 'https://rpc.tempo.xyz',
};

/** Chainlist / UI sometimes use hostnames that fail DNS; map to official RPC. */
export function canonicalTempoRpcUrl(chainId: number, url: string): string {
  const trimmed = url.trim();
  if (!isTempoChainId(chainId) || !trimmed) return trimmed;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    if (chainId === TEMPO_TESTNET_CHAIN_ID) {
      if (host === 'rpc.testnet.tempo.xyz' || host === 'testnet.tempo.xyz') {
        return TEMPO_OFFICIAL_RPC[TEMPO_TESTNET_CHAIN_ID];
      }
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

export function isTempoChainId(chainId: number | string): boolean {
  const id = typeof chainId === 'string' ? Number.parseInt(chainId, 10) : chainId;
  return Number.isFinite(id) && TEMPO_CHAIN_IDS.has(id);
}

/** UI dry-run quote only. Broadcast gas is refit in deploy.sh to stay under the 30M tx cap. */
export function deployGasMultiplierForChain(chainId: number | string): number {
  return isTempoChainId(chainId) ? 300 : 110;
}

export function resolveTempoFeeToken(chainId: number, fromChainJson?: string, fromBody?: string): string {
  const body = fromBody?.trim();
  if (body) return body;
  const configured = fromChainJson?.trim();
  if (configured) return configured;
  return TEMPO_DEFAULT_FEE_TOKEN[chainId] ?? '';
}

export const FORGE_TEMPO_UPGRADE_HINT =
  'Tempo deploy needs Foundry with --tempo.fee-token. Run: foundryup — then pnpm contracts:check-forge-tempo — then restart contracts ops-ui (Cursor tasks often use an old forge on PATH).';

/** True when `forge script` accepts `--tempo.fee-token` (recent upstream Foundry). */
export async function forgeSupportsTempoFeeToken(): Promise<boolean> {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execFileAsync = promisify(execFile);
  const env = withFoundryPath({ ...process.env, FOUNDRY_DISABLE_NIGHTLY_WARNING: '1' });
  const forge = resolveForgeExecutable(env);
  try {
    const { stdout, stderr } = await execFileAsync(forge, ['script', '--help'], {
      timeout: 15_000,
      env,
      maxBuffer: 4 * 1024 * 1024,
    });
    return `${stdout}\n${stderr}`.includes('--tempo.fee-token');
  } catch {
    return false;
  }
}

export async function assertForgeTempoSupportAsync(): Promise<void> {
  if (!(await forgeSupportsTempoFeeToken())) {
    throw new Error(FORGE_TEMPO_UPGRADE_HINT);
  }
}
