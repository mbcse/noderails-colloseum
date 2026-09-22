import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import type { ChainAllowlists } from './chain-allowlists.js';
import { deployGasMultiplierForChain, isTempoChainId } from './tempo-chain.js';

const QUOTE_TTL_MS = 90_000;
const GAS_MULTIPLIER = 110;
const BUMPS = [
  { id: 'min', label: 'Minimum', bps: 0 },
  { id: 'plus10', label: '+10%', bps: 1_000 },
  { id: 'plus25', label: '+25%', bps: 2_500 },
  { id: 'plus50', label: '+50%', bps: 5_000 },
] as const;

export type DeployBumpId = (typeof BUMPS)[number]['id'];

export type StoredDeployQuote = {
  id: string;
  at: number;
  chainId: string;
  target: string;
  allowlists: ChainAllowlists;
  tempoFeeToken: string;
  gasUsed: bigint;
  baseFeeWei: bigint;
  priorityFeeWei: bigint;
  nativeCurrency: string;
};

export type DeployQuoteView = {
  quoteId: string;
  expiresAt: number;
  nativeCurrency: string;
  isTempo: boolean;
  tempoFeeToken?: string;
  gasUsed: string;
  baseFeeGwei: string;
  priorityFeeGwei: string;
  bumps: {
    id: DeployBumpId;
    label: string;
    maxFeeGwei: string;
    maxNative: string;
  }[];
};

const quotes = new Map<string, StoredDeployQuote>();

function pruneQuotes() {
  const now = Date.now();
  for (const [id, q] of quotes) {
    if (now - q.at > QUOTE_TTL_MS) quotes.delete(id);
  }
}

export function weiToGweiLabel(wei: bigint): string {
  const gwei = Number(wei) / 1e9;
  if (!Number.isFinite(gwei)) return wei.toString();
  if (gwei >= 1) return gwei.toFixed(3).replace(/\.?0+$/, '');
  if (gwei >= 0.000001) return gwei.toFixed(6).replace(/\.?0+$/, '');
  return `${wei.toString()} wei`;
}

export function formatNative(wei: bigint, symbol: string): string {
  const neg = wei < 0n;
  const abs = neg ? -wei : wei;
  const whole = abs / 10n ** 18n;
  const frac = abs % 10n ** 18n;
  let fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '').slice(0, 6);
  const body = fracStr.length ? `${whole}.${fracStr}` : whole.toString();
  return `${neg ? '-' : ''}${body} ${symbol}`;
}

export function parseForgeGasUsed(output: string): bigint | null {
  const creates = [...output.matchAll(/\[(\d+)\] → new /g)].map((m) => BigInt(m[1]));
  if (creates.length) return creates.reduce((a, b) => a + b, 0n);
  const total = output.match(/Estimated total gas used for script:\s*(\d+)/i);
  if (total) return BigInt(total[1]);
  return null;
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json()) as { result?: T; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? `${method} failed`);
  if (body.result === undefined) throw new Error(`${method} missing result`);
  return body.result;
}

export async function readNetworkFees(rpcUrl: string): Promise<{
  baseFeeWei: bigint;
  priorityFeeWei: bigint;
}> {
  const block = await rpc<{ baseFeePerGas?: string }>(rpcUrl, 'eth_getBlockByNumber', [
    'latest',
    false,
  ]);
  const baseFeeWei = BigInt(block.baseFeePerGas ?? '0x0');
  let priorityFeeWei = 0n;
  try {
    priorityFeeWei = BigInt(await rpc<string>(rpcUrl, 'eth_maxPriorityFeePerGas', []));
  } catch {
    const gasPrice = BigInt(await rpc<string>(rpcUrl, 'eth_gasPrice', []));
    priorityFeeWei = gasPrice > baseFeeWei ? gasPrice - baseFeeWei : 0n;
  }
  if (priorityFeeWei === 0n && baseFeeWei > 0n) {
    const oneGwei = 1_000_000_000n;
    priorityFeeWei = baseFeeWei >= oneGwei ? oneGwei : 1n;
  }
  return { baseFeeWei, priorityFeeWei };
}

function applyBps(wei: bigint, bps: number): bigint {
  return (wei * BigInt(10_000 + bps)) / 10_000n;
}

export function bumpMaxFeeWei(quote: StoredDeployQuote, bumpId: string): bigint {
  const bump = BUMPS.find((b) => b.id === bumpId);
  if (!bump) throw new Error('Unknown fee bump');
  return applyBps(quote.baseFeeWei + quote.priorityFeeWei, bump.bps);
}

export function viewQuote(quote: StoredDeployQuote): DeployQuoteView {
  const isTempo = isTempoChainId(quote.chainId);
  return {
    quoteId: quote.id,
    expiresAt: quote.at + QUOTE_TTL_MS,
    nativeCurrency: quote.nativeCurrency,
    isTempo,
    tempoFeeToken: isTempo ? quote.tempoFeeToken : undefined,
    gasUsed: quote.gasUsed.toString(),
    baseFeeGwei: weiToGweiLabel(quote.baseFeeWei),
    priorityFeeGwei: weiToGweiLabel(quote.priorityFeeWei),
    bumps: BUMPS.map((b) => {
      const maxFee = applyBps(quote.baseFeeWei + quote.priorityFeeWei, b.bps);
      return {
        id: b.id,
        label: b.label,
        maxFeeGwei: weiToGweiLabel(maxFee),
        maxNative: formatNative(quote.gasUsed * maxFee, quote.nativeCurrency),
      };
    }),
  };
}

export function storeQuote(quote: StoredDeployQuote): DeployQuoteView {
  pruneQuotes();
  quotes.set(quote.id, quote);
  return viewQuote(quote);
}

export function takeQuote(input: {
  quoteId: unknown;
  bump: unknown;
  chainId: string;
  target: string;
  allowlists: ChainAllowlists;
  tempoFeeToken?: string;
}): { quote: StoredDeployQuote; maxFeeWei: bigint } {
  pruneQuotes();
  const id = String(input.quoteId ?? '');
  const quote = quotes.get(id);
  if (!quote) throw new Error('Fee quote expired. Estimate again.');
  if (Date.now() - quote.at > QUOTE_TTL_MS) {
    quotes.delete(id);
    throw new Error('Fee quote expired. Estimate again.');
  }
  if (quote.chainId !== input.chainId || quote.target !== input.target) {
    throw new Error('Fee quote does not match this deploy.');
  }
  if (
    quote.allowlists.swapRouters !== input.allowlists.swapRouters
    || quote.allowlists.bridgeRouters !== input.allowlists.bridgeRouters
    || quote.allowlists.settlementTokens !== input.allowlists.settlementTokens
  ) {
    throw new Error('Allowlists changed. Estimate again.');
  }
  const tempoFeeToken = String(input.tempoFeeToken ?? '');
  if (quote.tempoFeeToken !== tempoFeeToken) {
    throw new Error('Tempo fee token changed. Estimate again.');
  }
  const maxFeeWei = bumpMaxFeeWei(quote, String(input.bump ?? 'min'));
  quotes.delete(id);
  return { quote, maxFeeWei };
}

export function newQuoteId(): string {
  return randomUUID();
}

export function deployGasMultiplier(chainId?: number | string): number {
  if (chainId !== undefined && chainId !== '') {
    return deployGasMultiplierForChain(chainId);
  }
  return GAS_MULTIPLIER;
}

export async function runDeployDryRun(input: {
  scriptPath: string;
  cwd: string;
  chainId: string;
  target: string;
  env: NodeJS.ProcessEnv;
}): Promise<{ output: string; gasUsed: bigint }> {
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn('bash', [input.scriptPath, input.chainId, input.target], {
      cwd: input.cwd,
      env: input.env,
    });
    let buf = '';
    const onChunk = (chunk: Buffer) => {
      buf += chunk.toString('utf8');
    };
    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(buf);
      else reject(new Error(tailForgeError(buf) || `Estimate failed (exit ${code})`));
    });
  });
  const gasUsed = parseForgeGasUsed(output);
  if (!gasUsed || gasUsed <= 0n) {
    throw new Error('Could not read simulated gas from Forge');
  }
  return { output, gasUsed };
}

function tailForgeError(output: string): string {
  const lines = output
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.slice(-8).join('\n');
}

export { QUOTE_TTL_MS, GAS_MULTIPLIER };
