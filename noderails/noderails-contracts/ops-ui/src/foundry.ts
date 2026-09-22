import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ROLE_LABELS } from './catalog.js';
import { isTempoChainId } from './tempo-chain.js';

const execFileAsync = promisify(execFile);
const CAST_OPTS = {
  timeout: 20_000,
  env: { ...process.env, FOUNDRY_DISABLE_NIGHTLY_WARNING: '1' },
};

export type ChainInfo = {
  name: string;
  chainId: number;
  networkType: 'testnets' | 'mainnets';
  explorerUrl: string;
  nativeCurrency: string;
  rpcUrl: string;
  rpcUrlPublic: string;
  source?: 'curated' | 'custom' | 'ephemeral';
  /** Forge `--gas-limit` when set in script/chains.json */
  gasLimit?: string;
  /** Forge `--tempo.fee-token` (TIP-20 pathUSD / stable used to pay deploy gas) */
  tempoFeeToken?: string;
  /** Tempo Sourcify-compatible verifier base URL */
  verifierUrl?: string;
};

export type CustomChainEntry = {
  name: string;
  rpcUrl: string;
  explorerUrl?: string;
  nativeCurrency?: string;
  networkType?: 'testnets' | 'mainnets';
};

export function stripRpcKey(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('apiKey');
    u.searchParams.delete('apikey');
    return u.toString();
  } catch {
    return url.replace(/([?&]apiKey=)[^&]*/gi, '$1');
  }
}

export function loadCustomChains(path: string): Record<string, CustomChainEntry> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, CustomChainEntry>;
  } catch {
    return {};
  }
}

export function saveCustomChain(path: string, chainId: number, entry: CustomChainEntry): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const current = loadCustomChains(path);
  current[String(chainId)] = {
    name: entry.name.trim() || `Chain ${chainId}`,
    rpcUrl: entry.rpcUrl.trim(),
    explorerUrl: (entry.explorerUrl ?? '').trim(),
    nativeCurrency: (entry.nativeCurrency ?? 'ETH').trim() || 'ETH',
    networkType: entry.networkType === 'testnets' ? 'testnets' : 'mainnets',
  };
  writeFileSync(path, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
}

type CuratedChainRow = {
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: string;
  gasLimit?: number | string;
  tempoFeeToken?: string;
  verifierUrl?: string;
};

function curatedChains(chainsPath: string): ChainInfo[] {
  const data = JSON.parse(readFileSync(chainsPath, 'utf8')) as Record<
    string,
    Record<string, CuratedChainRow>
  >;
  const out: ChainInfo[] = [];
  for (const networkType of ['testnets', 'mainnets'] as const) {
    for (const [name, chain] of Object.entries(data[networkType] ?? {})) {
      const gasLimit =
        chain.gasLimit !== undefined && chain.gasLimit !== ''
          ? String(chain.gasLimit)
          : isTempoChainId(chain.chainId)
            ? '30000000'
            : undefined;
      out.push({
        name,
        chainId: chain.chainId,
        networkType,
        explorerUrl: chain.explorerUrl,
        nativeCurrency: chain.nativeCurrency,
        rpcUrl: chain.rpcUrl,
        rpcUrlPublic: stripRpcKey(chain.rpcUrl),
        source: 'curated',
        gasLimit,
        tempoFeeToken: chain.tempoFeeToken?.trim() || undefined,
        verifierUrl: chain.verifierUrl?.trim() || undefined,
      });
    }
  }
  return out;
}

/** Merge curated chains.json with deployData/customChains.json (custom wins on conflict). */
export function loadChains(chainsPath: string, customChainsPath?: string): ChainInfo[] {
  const byId = new Map<number, ChainInfo>();
  for (const chain of curatedChains(chainsPath)) {
    byId.set(chain.chainId, chain);
  }
  if (customChainsPath) {
    const custom = loadCustomChains(customChainsPath);
    for (const [id, entry] of Object.entries(custom)) {
      const chainId = Number(id);
      if (!Number.isFinite(chainId) || !entry.rpcUrl?.trim()) continue;
      const prior = byId.get(chainId);
      byId.set(chainId, {
        name: entry.name?.trim() || prior?.name || `Chain ${chainId}`,
        chainId,
        networkType: entry.networkType === 'testnets' ? 'testnets' : prior?.networkType ?? 'mainnets',
        explorerUrl: (entry.explorerUrl ?? prior?.explorerUrl ?? '').trim(),
        nativeCurrency: (entry.nativeCurrency ?? prior?.nativeCurrency ?? 'ETH').trim() || 'ETH',
        rpcUrl: entry.rpcUrl.trim(),
        rpcUrlPublic: stripRpcKey(entry.rpcUrl.trim()),
        source: 'custom',
      });
    }
  }
  return [...byId.values()].sort((a, b) => {
    const g = (a.networkType === 'mainnets' ? 1 : 0) - (b.networkType === 'mainnets' ? 1 : 0);
    if (g !== 0) return g;
    return a.name.localeCompare(b.name);
  });
}

export function loadAddresses(path: string): Record<string, Record<string, string>> {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, Record<string, string>>;
}

export type AddressBookRow = {
  chainId: number;
  name: string;
  networkType: 'testnets' | 'mainnets' | 'unknown';
  explorerUrl: string;
  escrow: string;
  merchantManager: string;
  hasEscrowAbi: boolean;
  hasMerchantManagerAbi: boolean;
};

export function loadAbis(path: string): Record<string, Record<string, unknown[]>> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, Record<string, unknown[]>>;
  } catch {
    return {};
  }
}

export function getContractAbi(
  abisPath: string,
  chainId: string | number,
  contract: 'NodeRailsEscrow' | 'NodeRailsMerchantManager',
): unknown[] | null {
  const all = loadAbis(abisPath);
  const direct = all[String(chainId)]?.[contract];
  if (Array.isArray(direct) && direct.length) return direct;
  for (const row of Object.values(all)) {
    const abi = row?.[contract];
    if (Array.isArray(abi) && abi.length) return abi;
  }
  return null;
}

/** Only chains that have at least one deployed contract address. */
export function loadAddressBook(
  chainsPath: string,
  addressesPath: string,
  customChainsPath?: string,
  abisPath?: string,
): AddressBookRow[] {
  const chains = loadChains(chainsPath, customChainsPath);
  const byId = new Map(chains.map((c) => [String(c.chainId), c]));
  const addresses = loadAddresses(addressesPath);
  const abis = abisPath ? loadAbis(abisPath) : {};
  const anyEscrow = Object.values(abis).some(
    (r) => Array.isArray(r?.NodeRailsEscrow) && r.NodeRailsEscrow.length > 0,
  );
  const anyMm = Object.values(abis).some(
    (r) => Array.isArray(r?.NodeRailsMerchantManager) && r.NodeRailsMerchantManager.length > 0,
  );
  return Object.keys(addresses)
    .filter((id) => {
      const deployed = addresses[id] ?? {};
      return Boolean(deployed.NodeRailsEscrow || deployed.NodeRailsMerchantManager);
    })
    .sort((a, b) => {
      const left = byId.get(a);
      const right = byId.get(b);
      const group = (c?: ChainInfo) => (c?.networkType === 'mainnets' ? 1 : 0);
      const g = group(left) - group(right);
      if (g !== 0) return g;
      return (left?.name ?? a).localeCompare(right?.name ?? b);
    })
    .map((id) => {
      const chain = byId.get(id);
      const deployed = addresses[id] ?? {};
      const chainAbis = abis[id] ?? {};
      return {
        chainId: Number(id),
        name: chain?.name ?? `Chain ${id}`,
        networkType: chain?.networkType ?? 'unknown',
        explorerUrl: chain?.explorerUrl ?? '',
        escrow: deployed.NodeRailsEscrow ?? '',
        merchantManager: deployed.NodeRailsMerchantManager ?? '',
        hasEscrowAbi: Boolean(
          (Array.isArray(chainAbis.NodeRailsEscrow) && chainAbis.NodeRailsEscrow.length) || anyEscrow,
        ),
        hasMerchantManagerAbi: Boolean(
          (Array.isArray(chainAbis.NodeRailsMerchantManager) && chainAbis.NodeRailsMerchantManager.length)
            || anyMm,
        ),
      };
    });
}

export function loadHistory(path: string): unknown[] {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8')) as unknown[];
}

export function firstAddress(list: string): string {
  return list.split(',')[0]?.trim() ?? '';
}

export async function castWalletAddress(privateKey: string): Promise<string> {
  if (!privateKey) return '';
  const { stdout } = await execFileAsync('cast', ['wallet', 'address', '--private-key', privateKey], {
    timeout: 15_000,
    env: CAST_OPTS.env,
  });
  return stdout.trim();
}

export async function castBalance(rpcUrl: string, address: string): Promise<string> {
  if (!address) return '';
  const { stdout } = await execFileAsync(
    'cast',
    ['balance', address, '--rpc-url', rpcUrl, '--ether'],
    CAST_OPTS,
  );
  return stdout.trim();
}

export async function castCall(
  rpcUrl: string,
  to: string,
  signature: string,
  args: string[] = [],
): Promise<string> {
  const { stdout } = await execFileAsync(
    'cast',
    ['call', to, signature, ...args, '--rpc-url', rpcUrl],
    CAST_OPTS,
  );
  return stdout.trim();
}

export function roleLabel(raw: string): string {
  const n = Number.parseInt(raw, 10);
  if (Number.isFinite(n) && ROLE_LABELS[n]) return ROLE_LABELS[n];
  return raw || 'unknown';
}

export function splitAddresses(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function uniqueAddresses(values: string | string[]): string[] {
  const list = typeof values === 'string' ? splitAddresses(values) : values;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of list) {
    const a = v.trim().toLowerCase();
    if (!a || seen.has(a)) continue;
    seen.add(a);
    out.push(v.trim());
  }
  return out;
}

export function parseCastBool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return null;
}

export function parseCastAddress(raw: string): string {
  const m = raw.match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0] : raw.trim();
}

export function ephemeralChain(input: {
  chainId: number;
  rpcUrl: string;
  name?: string;
  explorerUrl?: string;
  nativeCurrency?: string;
  networkType?: 'testnets' | 'mainnets';
}): ChainInfo {
  const rpcUrl = input.rpcUrl.trim();
  return {
    name: input.name?.trim() || `Chain ${input.chainId}`,
    chainId: input.chainId,
    networkType: input.networkType === 'testnets' ? 'testnets' : 'mainnets',
    explorerUrl: (input.explorerUrl ?? '').trim(),
    nativeCurrency: (input.nativeCurrency ?? 'ETH').trim() || 'ETH',
    rpcUrl,
    rpcUrlPublic: stripRpcKey(rpcUrl),
    source: 'ephemeral',
  };
}
