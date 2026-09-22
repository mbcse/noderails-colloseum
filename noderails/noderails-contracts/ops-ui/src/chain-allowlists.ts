import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { uniqueAddresses } from './foundry.js';

export type ChainAllowlists = {
  swapRouters: string;
  bridgeRouters: string;
  settlementTokens: string;
};

const EMPTY: ChainAllowlists = { swapRouters: '', bridgeRouters: '', settlementTokens: '' };
const ADDR = /^0x[0-9a-fA-F]{40}$/;

export function normalizeAddressList(value: unknown, label: string): string {
  if (value == null) return '';
  if (typeof value !== 'string') throw new Error(`${label} must be a string`);
  const addrs = uniqueAddresses(value);
  for (const addr of addrs) {
    if (!ADDR.test(addr)) throw new Error(`Invalid address in ${label}: ${addr}`);
  }
  return addrs.join(',');
}

function readAll(path: string): Record<string, ChainAllowlists> {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Record<string, Partial<ChainAllowlists>>;
    const out: Record<string, ChainAllowlists> = {};
    for (const [id, row] of Object.entries(parsed ?? {})) {
      out[id] = {
        swapRouters: typeof row.swapRouters === 'string' ? row.swapRouters : '',
        bridgeRouters: typeof row.bridgeRouters === 'string' ? row.bridgeRouters : '',
        settlementTokens: typeof row.settlementTokens === 'string' ? row.settlementTokens : '',
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function readChainAllowlists(path: string, chainId: string): ChainAllowlists {
  return readAll(path)[chainId] ?? { ...EMPTY };
}

export function writeChainAllowlists(path: string, chainId: string, next: ChainAllowlists): void {
  const all = readAll(path);
  all[chainId] = next;
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(all, null, 2)}\n`);
  renameSync(tmp, path);
}
