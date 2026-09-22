import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type ChainInfo, stripRpcKey } from './foundry.js';
import { canonicalTempoRpcUrl, isTempoChainId, TEMPO_OFFICIAL_RPC } from './tempo-chain.js';

const execFileAsync = promisify(execFile);

export const CHAINLIST_URL = 'https://chainlist.org/rpcs.json';
const LIST_TTL_MS = 6 * 60 * 60 * 1000;
const WORKING_TTL_MS = 15 * 60 * 1000;
const PROBE_MS = 6_000;
const MAX_FALLBACKS = 12;
const BATCH = 3;

type RpcEntry = { url: string; tracking: string };

export type ChainlistCatalogRow = {
  chainId: number;
  name: string;
  shortName: string;
  isTestnet: boolean;
  nativeCurrencySymbol: string;
  explorerUrl: string;
  rpcs: string[];
};

let listCache: {
  at: number;
  byChain: Map<number, RpcEntry[]>;
  catalog: ChainlistCatalogRow[];
} | null = null;
const working = new Map<number, { url: string; fallback: boolean; at: number }>();

const TRACK_RANK: Record<string, number> = {
  none: 0,
  limited: 1,
  unspecified: 2,
  yes: 3,
};

export function rpcHost(url: string): string {
  try {
    return new URL(stripRpcKey(url)).host;
  } catch {
    return 'rpc';
  }
}

function usableHttps(url: string): boolean {
  if (!url.startsWith('https://')) return false;
  if (url.includes('${') || url.includes('<') || url.includes(' ')) return false;
  if (/API[_-]?KEY/i.test(url) && url.includes('$')) return false;
  return true;
}

function parseRpcList(rpc: unknown): RpcEntry[] {
  if (!Array.isArray(rpc)) return [];
  const out: RpcEntry[] = [];
  for (const item of rpc) {
    if (typeof item === 'string') {
      out.push({ url: item.trim(), tracking: 'unspecified' });
      continue;
    }
    if (item && typeof item === 'object' && 'url' in item) {
      const url = String((item as { url?: unknown }).url ?? '').trim();
      const tracking = String((item as { tracking?: unknown }).tracking ?? 'unspecified');
      out.push({ url, tracking });
    }
  }
  return out;
}

function firstExplorerUrl(explorers: unknown): string {
  if (!Array.isArray(explorers)) return '';
  for (const item of explorers) {
    if (!item || typeof item !== 'object') continue;
    const url = String((item as { url?: unknown }).url ?? '').trim();
    if (url.startsWith('https://')) return url.replace(/\/$/, '');
  }
  return '';
}

function rankRpcs(rpc: unknown): string[] {
  const entries = parseRpcList(rpc)
    .filter((e) => usableHttps(e.url))
    .sort((a, b) => (TRACK_RANK[a.tracking] ?? 9) - (TRACK_RANK[b.tracking] ?? 9));
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const e of entries) {
    const key = e.url.replace(/\/+$/, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(e.url);
    if (unique.length >= MAX_FALLBACKS) break;
  }
  return unique;
}

async function ensureChainlist(): Promise<{
  byChain: Map<number, RpcEntry[]>;
  catalog: ChainlistCatalogRow[];
}> {
  if (listCache && Date.now() - listCache.at < LIST_TTL_MS) {
    return { byChain: listCache.byChain, catalog: listCache.catalog };
  }
  const res = await fetch(CHAINLIST_URL, { signal: AbortSignal.timeout(45_000) });
  if (!res.ok) throw new Error(`chainlist HTTP ${res.status}`);
  const data = (await res.json()) as Array<{
    chainId?: number;
    name?: string;
    shortName?: string;
    isTestnet?: boolean;
    rpc?: unknown;
    explorers?: unknown;
    nativeCurrency?: { symbol?: string };
  }>;
  const byChain = new Map<number, RpcEntry[]>();
  const catalog: ChainlistCatalogRow[] = [];
  for (const chain of data) {
    const id = Number(chain.chainId);
    if (!Number.isFinite(id)) continue;
    const rpcs = rankRpcs(chain.rpc);
    if (!rpcs.length) continue;
    byChain.set(
      id,
      rpcs.map((url) => ({ url, tracking: 'unspecified' })),
    );
    catalog.push({
      chainId: id,
      name: String(chain.name ?? `Chain ${id}`),
      shortName: String(chain.shortName ?? ''),
      isTestnet: Boolean(chain.isTestnet),
      nativeCurrencySymbol: String(chain.nativeCurrency?.symbol ?? 'ETH'),
      explorerUrl: firstExplorerUrl(chain.explorers),
      rpcs,
    });
  }
  catalog.sort((a, b) => a.name.localeCompare(b.name));
  listCache = { at: Date.now(), byChain, catalog };
  return { byChain, catalog };
}

export async function getChainlistCatalog(): Promise<ChainlistCatalogRow[]> {
  const { catalog } = await ensureChainlist();
  return catalog;
}

export async function lookupChainlistRow(chainId: number): Promise<ChainlistCatalogRow | null> {
  try {
    const catalog = await getChainlistCatalog();
    return catalog.find((c) => c.chainId === chainId) ?? null;
  } catch {
    return null;
  }
}

export async function probeRpc(url: string, chainId: number): Promise<boolean> {
  try {
    const env = { ...process.env, FOUNDRY_DISABLE_NIGHTLY_WARNING: '1' };
    const [id, nonce] = await Promise.all([
      execFileAsync('cast', ['chain-id', '--rpc-url', url], { timeout: PROBE_MS, env }),
      execFileAsync(
        'cast',
        ['nonce', '0x0000000000000000000000000000000000000000', '--rpc-url', url],
        { timeout: PROBE_MS, env },
      ),
    ]);
    if (Number.parseInt(id.stdout.trim(), 10) !== chainId) return false;
    return /^\d+$/.test(nonce.stdout.trim());
  } catch {
    return false;
  }
}

async function firstWorking(urls: string[], chainId: number): Promise<string | null> {
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const winner = await Promise.any(
      batch.map(async (url) => {
        if (await probeRpc(url, chainId)) return url;
        throw new Error('dead');
      }),
    ).catch(() => null);
    if (winner) return winner;
  }
  return null;
}

function curatedRpcUrl(chain: ChainInfo): string {
  const base = chain.rpcUrl?.trim() ?? '';
  if (!base) return isTempoChainId(chain.chainId) ? TEMPO_OFFICIAL_RPC[chain.chainId] ?? base : base;
  return isTempoChainId(chain.chainId) ? canonicalTempoRpcUrl(chain.chainId, base) : base;
}

export async function resolveWorkingRpc(
  chain: ChainInfo,
  preferredRpcUrl?: string,
): Promise<{
  url: string;
  host: string;
  fallback: boolean;
}> {
  const curated = curatedRpcUrl(chain);
  let preferred = (preferredRpcUrl ?? '').trim();
  if (preferred && isTempoChainId(chain.chainId)) {
    preferred = canonicalTempoRpcUrl(chain.chainId, preferred);
  }
  if (preferred) {
    if (await probeRpc(preferred, chain.chainId)) {
      working.set(chain.chainId, { url: preferred, fallback: false, at: Date.now() });
      return { url: preferred, host: rpcHost(preferred), fallback: false };
    }
    if (curated && curated !== preferred && (await probeRpc(curated, chain.chainId))) {
      working.set(chain.chainId, { url: curated, fallback: true, at: Date.now() });
      return { url: curated, host: rpcHost(curated), fallback: true };
    }
    const official =
      isTempoChainId(chain.chainId) ? TEMPO_OFFICIAL_RPC[chain.chainId] : '';
    if (official && official !== preferred && official !== curated && (await probeRpc(official, chain.chainId))) {
      working.set(chain.chainId, { url: official, fallback: true, at: Date.now() });
      return { url: official, host: rpcHost(official), fallback: true };
    }
    throw new Error(
      `RPC unreachable (${rpcHost(preferred)}). `
        + (isTempoChainId(chain.chainId)
          ? `Use ${TEMPO_OFFICIAL_RPC[chain.chainId]} in the Chain tab.`
          : 'Pick another HTTPS RPC.'),
    );
  }

  const cached = working.get(chain.chainId);
  if (cached && Date.now() - cached.at < WORKING_TTL_MS) {
    const cachedUrl = isTempoChainId(chain.chainId)
      ? canonicalTempoRpcUrl(chain.chainId, cached.url)
      : cached.url;
    if (await probeRpc(cachedUrl, chain.chainId)) {
      return { url: cachedUrl, host: rpcHost(cachedUrl), fallback: cached.fallback };
    }
    working.delete(chain.chainId);
  }

  if (curated && (await probeRpc(curated, chain.chainId))) {
    working.set(chain.chainId, { url: curated, fallback: false, at: Date.now() });
    return { url: curated, host: rpcHost(curated), fallback: false };
  }

  let fallbacks: string[] = [];
  try {
    const { byChain } = await ensureChainlist();
    fallbacks = (byChain.get(chain.chainId) ?? []).map((e) => e.url);
  } catch {
    fallbacks = [];
  }

  const tempoFallbacks = isTempoChainId(chain.chainId)
    ? [TEMPO_OFFICIAL_RPC[chain.chainId], curated, ...fallbacks].filter(Boolean)
    : fallbacks;
  const winner = await firstWorking(tempoFallbacks, chain.chainId);
  const url = winner ?? curated ?? chain.rpcUrl;
  const fallback = Boolean(winner);
  working.set(chain.chainId, { url, fallback, at: Date.now() });
  return { url, host: rpcHost(url), fallback };
}
