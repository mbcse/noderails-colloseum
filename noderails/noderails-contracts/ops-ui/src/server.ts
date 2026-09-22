import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG, ENV_KEYS, MATRIX, VIEW_SIG, type CatalogFn } from './catalog.js';
import { mergeEnvFile, readAllowlistedEnv } from './env-file.js';
import {
  castBalance,
  castCall,
  castWalletAddress,
  ephemeralChain,
  firstAddress,
  getContractAbi,
  loadAddressBook,
  loadAddresses,
  loadChains,
  loadHistory,
  roleLabel,
  uniqueAddresses,
  parseCastBool,
  parseCastAddress,
  saveCustomChain,
  splitAddresses,
  type ChainInfo,
} from './foundry.js';
import { pageHtml } from './page.js';
import { getChainlistCatalog, lookupChainlistRow, probeRpc, resolveWorkingRpc, rpcHost } from './rpc-pool.js';
import {
  normalizeAddressList,
  readChainAllowlists,
  writeChainAllowlists,
  type ChainAllowlists,
} from './chain-allowlists.js';
import {
  deployGasMultiplier,
  newQuoteId,
  readNetworkFees,
  runDeployDryRun,
  storeQuote,
  takeQuote,
} from './deploy-fee.js';
import { resolveForgeExecutable, withFoundryPath } from './foundry-path.js';
import { assertForgeTempoSupportAsync, isTempoChainId, resolveTempoFeeToken } from './tempo-chain.js';

const OPS_DIR = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_ROOT = join(OPS_DIR, '..', '..');
const CHAINS_PATH = join(CONTRACTS_ROOT, 'script', 'chains.json');
const ADDRESSES_PATH = join(CONTRACTS_ROOT, 'deployData', 'contractAddresses.json');
const ABIS_PATH = join(CONTRACTS_ROOT, 'deployData', 'contractAbis.json');
const CUSTOM_CHAINS_PATH = join(CONTRACTS_ROOT, 'deployData', 'customChains.json');
const HISTORY_PATH = join(CONTRACTS_ROOT, 'deployData', 'deploymentHistory.json');
const ALLOWLISTS_PATH = join(CONTRACTS_ROOT, 'deployData', 'chainAllowlists.json');
const ENV_PATH = join(CONTRACTS_ROOT, '.env');
const EXAMPLE_PATH = join(CONTRACTS_ROOT, '.env.example');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 5055);

const DEPLOY_TARGETS = new Set(['all', 'escrow', 'merchant-manager']);
const ROLES_TARGETS = new Set(['setup', 'add-tx-keys', 'add-admins', 'remove-keys']);
const WAR_ROOM_SCRIPT_BY_TARGET: Record<string, string> = {
  all: 'DeployAll',
  escrow: 'DeployEscrow',
  'merchant-manager': 'DeployMerchantManager',
};
const SETTINGS_TARGETS = new Set([
  'configure',
  'set-swap-router',
  'set-bridge-router',
  'set-settlement-token',
  'set-fee-on-transfer',
  'set-fee-recipient',
  'set-key-role',
  'pause',
  'unpause',
  'full-stop',
  'lift-full-stop',
  'emergency-withdraw',
]);
const DANGER_SETTINGS = new Set(['full-stop', 'lift-full-stop', 'emergency-withdraw']);

type WarRoomStatus = {
  configured: boolean;
  hasLocal: boolean;
  status: 'matched' | 'stale' | 'missing' | 'error' | 'unconfigured';
  message?: string;
  remoteEscrow?: string;
  remoteMerchantManager?: string;
};

function normAddr(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function loadWarRoomStatus(
  chainId: number,
  localEscrow: string,
  localMm: string,
): Promise<WarRoomStatus> {
  const env = readAllowlistedEnv(ENV_PATH, EXAMPLE_PATH);
  const base = (env.WAR_ROOM_URL ?? '').trim().replace(/\/$/, '');
  const hasLocal = Boolean(normAddr(localEscrow) || normAddr(localMm));
  if (!base || !(env.WAR_ROOM_DEPLOY_API_KEY ?? '').trim()) {
    return {
      configured: false,
      hasLocal,
      status: 'unconfigured',
      message: 'Set WAR_ROOM_URL and WAR_ROOM_DEPLOY_API_KEY in Env.',
    };
  }
  if (!hasLocal) {
    return { configured: true, hasLocal: false, status: 'missing', message: 'Deploy contracts first.' };
  }
  try {
    const remote = await fetchWarRoomDeployments(base);
    return statusFromRemote(chainId, localEscrow, localMm, remote);
  } catch (err) {
    return {
      configured: true,
      hasLocal,
      status: 'error',
      message: err instanceof Error ? err.message : 'War Room unreachable',
    };
  }
}

type WarRoomDeploymentRow = {
  chainId?: number;
  escrow?: string | null;
  merchantManager?: string | null;
};

async function fetchWarRoomDeployments(base: string): Promise<WarRoomDeploymentRow[]> {
  const res = await fetch(`${base}/api/deployments`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    throw new Error(`War Room GET /api/deployments failed (${res.status})`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

function statusFromRemote(
  chainId: number,
  localEscrow: string,
  localMm: string,
  rows: WarRoomDeploymentRow[],
): WarRoomStatus {
  const hasLocal = Boolean(normAddr(localEscrow) || normAddr(localMm));
  const row = rows.find((r) => Number(r.chainId) === Number(chainId));
  if (!row) {
    return { configured: true, hasLocal, status: 'missing' };
  }
  const remoteEscrow = normAddr(row.escrow);
  const remoteMm = normAddr(row.merchantManager);
  const localE = normAddr(localEscrow);
  const localM = normAddr(localMm);
  const matched =
    (!localE || remoteEscrow === localE) &&
    (!localM || remoteMm === localM) &&
    (Boolean(localE) || Boolean(localM));
  return {
    configured: true,
    hasLocal,
    status: matched ? 'matched' : 'stale',
    remoteEscrow: row.escrow ?? undefined,
    remoteMerchantManager: row.merchantManager ?? undefined,
  };
}

async function annotateAddressBookWarRoom(
  rows: ReturnType<typeof loadAddressBook>,
): Promise<{ rows: Array<(typeof rows)[number] & { warRoomStatus: string }>; warRoomConfigured: boolean }> {
  const env = readAllowlistedEnv(ENV_PATH, EXAMPLE_PATH);
  const base = (env.WAR_ROOM_URL ?? '').trim().replace(/\/$/, '');
  const configured = Boolean(base && (env.WAR_ROOM_DEPLOY_API_KEY ?? '').trim());
  if (!configured) {
    return {
      warRoomConfigured: false,
      rows: rows.map((r) => ({ ...r, warRoomStatus: 'unconfigured' })),
    };
  }
  let remote: WarRoomDeploymentRow[] = [];
  try {
    remote = await fetchWarRoomDeployments(base);
  } catch {
    return {
      warRoomConfigured: true,
      rows: rows.map((r) => ({
        ...r,
        warRoomStatus: r.escrow || r.merchantManager ? 'error' : '—',
      })),
    };
  }
  return {
    warRoomConfigured: true,
    rows: rows.map((r) => {
      if (!r.escrow && !r.merchantManager) {
        return { ...r, warRoomStatus: '—' };
      }
      return {
        ...r,
        warRoomStatus: statusFromRemote(r.chainId, r.escrow, r.merchantManager, remote).status,
      };
    }),
  };
}

type SseClient = ServerResponse;

const sseClients = new Set<SseClient>();
let running: ChildProcessWithoutNullStreams | null = null;
let estimating = false;
let pendingCustomPersist: {
  chainId: number;
  rpcUrl: string;
  name: string;
  explorerUrl: string;
  nativeCurrency: string;
  networkType: 'testnets' | 'mainnets';
} | null = null;

function allKnownChains(): ChainInfo[] {
  return loadChains(CHAINS_PATH, CUSTOM_CHAINS_PATH);
}

function findChain(chainId: string | number): ChainInfo | undefined {
  return allKnownChains().find((c) => String(c.chainId) === String(chainId));
}

async function chainFromBody(body: Record<string, unknown>): Promise<ChainInfo> {
  const chainId = Number(body.chainId);
  if (!Number.isFinite(chainId) || chainId <= 0) throw new Error('chainId required');
  const rpcUrl = typeof body.rpcUrl === 'string' ? body.rpcUrl.trim() : '';
  const known = findChain(chainId);
  // Keep the curated RPC on the chain record. The request RPC is tried first in
  // resolveWorkingRpc and, if it cannot serve eth_getTransactionCount, the curated URL is the fallback.
  if (known) return known;
  if (!rpcUrl) throw new Error('Unknown chain — pick an RPC from chainlist or enter one');
  const catalog = await lookupChainlistRow(chainId);
  const bodyName = typeof body.chainName === 'string' ? body.chainName.trim() : '';
  const bodyExplorer = typeof body.explorerUrl === 'string' ? body.explorerUrl.trim() : '';
  const bodyNative = typeof body.nativeCurrency === 'string' ? body.nativeCurrency.trim() : '';
  const bodyNet =
    body.networkType === 'testnets' || body.networkType === 'mainnets' ? body.networkType : null;
  return ephemeralChain({
    chainId,
    rpcUrl,
    name: bodyName || catalog?.name || `Chain ${chainId}`,
    explorerUrl: bodyExplorer || catalog?.explorerUrl || '',
    nativeCurrency: bodyNative || catalog?.nativeCurrencySymbol || 'ETH',
    networkType: bodyNet ?? (catalog?.isTestnet ? 'testnets' : 'mainnets'),
  });
}

function scriptEnvFor(
  chain: ChainInfo,
  rpcUrl: string,
  tempoFeeToken?: string,
): Record<string, string> {
  const env: Record<string, string> = {
    RPC_URL: rpcUrl,
    OPS_CHAIN_NAME: chain.name,
    OPS_EXPLORER_URL: chain.explorerUrl,
  };
  if (isTempoChainId(chain.chainId)) {
    const token = resolveTempoFeeToken(chain.chainId, chain.tempoFeeToken, tempoFeeToken);
    if (token) env.DEPLOY_TEMPO_FEE_TOKEN = token;
  }
  return env;
}

function tempoFeeTokenFromBody(
  chain: ChainInfo,
  body: Record<string, unknown>,
): string {
  const raw = typeof body.tempoFeeToken === 'string' ? body.tempoFeeToken : '';
  const token = resolveTempoFeeToken(chain.chainId, chain.tempoFeeToken, raw);
  if (isTempoChainId(chain.chainId) && !token) {
    throw new Error('Tempo deploy requires a TIP-20 fee token (pathUSD). Set it on the Deploy card.');
  }
  if (isTempoChainId(chain.chainId) && !/^0x[0-9a-fA-F]{40}$/.test(token)) {
    throw new Error('Invalid Tempo fee token address');
  }
  return token;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function secretValues(): string[] {
  const env = readAllowlistedEnv(ENV_PATH, EXAMPLE_PATH);
  return ENV_KEYS.map((k) => env[k])
    .filter((v) => v.length >= 8)
    .sort((a, b) => b.length - a.length);
}

function redact(line: string): string {
  let out = line;
  for (const secret of secretValues()) {
    out = out.split(secret).join('***');
  }
  out = out.replace(/--private-key\s+\S+/g, '--private-key ***');
  out = out.replace(/([?&]apiKey=)[^&\s]*/gi, '$1***');
  return out;
}

function emitLog(line: string) {
  const safe = redact(line);
  console.log(safe);
  broadcast('log', line);
}

function broadcast(event: string, data: string) {
  const payload = `event: ${event}\ndata: ${redact(data).replace(/\n/g, '\\n')}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function deriveAddress(label: string, privateKey: string, fallback: string) {
  let address = fallback;
  if (privateKey) {
    try {
      address = await castWalletAddress(privateKey);
    } catch {
      /* keep fallback */
    }
  }
  return { label, address };
}

async function readBool(rpcUrl: string, to: string, sig: string): Promise<{ value: boolean | null; error: boolean }> {
  try {
    const value = parseCastBool(await castCall(rpcUrl, to, sig, []));
    return { value, error: value === null };
  } catch {
    return { value: null, error: true };
  }
}

async function readAddress(rpcUrl: string, to: string, sig: string): Promise<{ value: string; error: boolean }> {
  try {
    const value = parseCastAddress(await castCall(rpcUrl, to, sig, []));
    return { value, error: !value };
  } catch {
    return { value: '', error: true };
  }
}

async function readAllowed(
  rpcUrl: string,
  to: string,
  sig: string,
  addrs: string[],
): Promise<{ rows: { address: string; allowed: boolean | null }[]; error: boolean }> {
  const rows = [];
  let error = false;
  for (const address of addrs) {
    try {
      const allowed = parseCastBool(await castCall(rpcUrl, to, sig, [address]));
      if (allowed === null) error = true;
      rows.push({ address, allowed });
    } catch {
      error = true;
      rows.push({ address, allowed: null });
    }
  }
  return { rows, error };
}

async function loadOnchain(
  rpcUrl: string,
  deployed: Record<string, string>,
  allowlists: ChainAllowlists,
) {
  const escrowAddr = deployed.NodeRailsEscrow ?? '';
  const mmAddr = deployed.NodeRailsMerchantManager ?? '';
  let escrow = null;
  if (escrowAddr) {
    const [feeRecipient, paused, fullStopped, swapRouters, bridgeRouters, settlementTokens, feeOnTransferEnabled] =
      await Promise.all([
        readAddress(rpcUrl, escrowAddr, VIEW_SIG.feeRecipient),
        readBool(rpcUrl, escrowAddr, VIEW_SIG.paused),
        readBool(rpcUrl, escrowAddr, VIEW_SIG.fullStopped),
        readAllowed(
          rpcUrl,
          escrowAddr,
          VIEW_SIG.allowedSwapRouters,
          uniqueAddresses(allowlists.swapRouters),
        ),
        readAllowed(
          rpcUrl,
          escrowAddr,
          VIEW_SIG.allowedBridgeRouters,
          uniqueAddresses(allowlists.bridgeRouters),
        ),
        readAllowed(
          rpcUrl,
          escrowAddr,
          VIEW_SIG.allowedSettlementTokens,
          uniqueAddresses(allowlists.settlementTokens),
        ),
        readBool(rpcUrl, escrowAddr, VIEW_SIG.feeOnTransferEnabled),
      ]);
    escrow = {
      address: escrowAddr,
      feeRecipient: feeRecipient.value,
      paused: paused.value,
      fullStopped: fullStopped.value,
      feeOnTransferEnabled: feeOnTransferEnabled.value,
      swapRouters: swapRouters.rows,
      bridgeRouters: bridgeRouters.rows,
      settlementTokens: settlementTokens.rows,
      rpcError:
        feeRecipient.error ||
        paused.error ||
        fullStopped.error ||
        feeOnTransferEnabled.error ||
        swapRouters.error ||
        bridgeRouters.error ||
        settlementTokens.error,
    };
  }
  let merchantManager = null;
  if (mmAddr) {
    const [feeRecipient, paused, fullStopped] = await Promise.all([
      readAddress(rpcUrl, mmAddr, VIEW_SIG.feeRecipient),
      readBool(rpcUrl, mmAddr, VIEW_SIG.paused),
      readBool(rpcUrl, mmAddr, VIEW_SIG.fullStopped),
    ]);
    merchantManager = {
      address: mmAddr,
      feeRecipient: feeRecipient.value,
      paused: paused.value,
      fullStopped: fullStopped.value,
      rpcError: feeRecipient.error || paused.error || fullStopped.error,
    };
  }
  return { escrow, merchantManager };
}

async function loadState(
  chainIdRaw: string,
  preferredRpcUrl?: string,
  meta?: {
    chainName?: string;
    explorerUrl?: string;
    nativeCurrency?: string;
    networkType?: string;
  },
) {
  const chains = allKnownChains();
  let chain = findChain(chainIdRaw);
  if (!chain && preferredRpcUrl && chainIdRaw) {
    const chainId = Number(chainIdRaw);
    const catalog = Number.isFinite(chainId) ? await lookupChainlistRow(chainId) : null;
    const net =
      meta?.networkType === 'testnets' || meta?.networkType === 'mainnets'
        ? meta.networkType
        : catalog?.isTestnet
          ? 'testnets'
          : 'mainnets';
    chain = ephemeralChain({
      chainId,
      rpcUrl: preferredRpcUrl,
      name: meta?.chainName?.trim() || catalog?.name || `Chain ${chainIdRaw}`,
      explorerUrl: meta?.explorerUrl?.trim() || catalog?.explorerUrl || '',
      nativeCurrency: meta?.nativeCurrency?.trim() || catalog?.nativeCurrencySymbol || 'ETH',
      networkType: net,
    });
  }
  chain = chain ?? chains[0];
  if (!chain) throw new Error('No chains configured — pick one from chainlist');
  const env = readAllowlistedEnv(ENV_PATH, EXAMPLE_PATH);
  const allAddresses = loadAddresses(ADDRESSES_PATH);
  const deployed = allAddresses[String(chain.chainId)] ?? {};
  const history = loadHistory(HISTORY_PATH);

  const people = [
    await deriveAddress('deployer', env.DEPLOYER_PRIVATE_KEY, ''),
    await deriveAddress('superAdmin', '', firstAddress(env.SUPER_ADMIN_ADDRESSES)),
    await deriveAddress('admin', env.ADMIN_PRIVATE_KEY, firstAddress(env.ADMIN_ADDRESSES)),
    { label: 'feeRecipient', address: env.FEE_RECIPIENT_ADDRESS },
    ...splitAddresses(env.TRANSACTION_KEY_ADDRESSES).map((address, i) => ({
      label: `txKey[${i}]`,
      address,
    })),
  ];

  const escrow = deployed.NodeRailsEscrow ?? '';
  const mm = deployed.NodeRailsMerchantManager ?? '';
  const rpc = await resolveWorkingRpc(chain, preferredRpcUrl);

  const balances = await Promise.all(
    people.map(async (p) => {
      let balance = '';
      let escrowRole = '';
      let mmRole = '';
      if (p.address) {
        if (isTempoChainId(chain.chainId)) {
          balance = 'N/A (Tempo: fund TIP-20 fee token)';
        } else {
          try {
            balance = await castBalance(rpc.url, p.address);
          } catch {
            balance = 'RPC error';
          }
        }
        if (escrow) {
          try {
            escrowRole = roleLabel(await castCall(rpc.url, escrow, VIEW_SIG.getKeyRole, [p.address]));
          } catch {
            escrowRole = 'unknown';
          }
        }
        if (mm) {
          try {
            mmRole = roleLabel(await castCall(rpc.url, mm, VIEW_SIG.getKeyRole, [p.address]));
          } catch {
            mmRole = 'unknown';
          }
        }
      }
      return { ...p, balance, escrowRole, mmRole };
    }),
  );

  const admin = people.find((p) => p.label === 'admin');
  const superAdmin = people.find((p) => p.label === 'superAdmin');
  const signerRoles = {
    adminEscrow: balances.find((b) => b.label === 'admin')?.escrowRole ?? '',
    superEscrow: balances.find((b) => b.label === 'superAdmin')?.escrowRole ?? '',
    adminMm: balances.find((b) => b.label === 'admin')?.mmRole ?? '',
    superMm: balances.find((b) => b.label === 'superAdmin')?.mmRole ?? '',
    adminAddress: admin?.address ?? '',
    superAddress: superAdmin?.address ?? '',
  };

  const contractBalances: { label: string; address: string; balance: string }[] = [];
  for (const [label, address] of [
    ['escrow', escrow],
    ['merchantManager', mm],
  ] as const) {
    if (!address) continue;
    if (isTempoChainId(chain.chainId)) {
      contractBalances.push({ label, address, balance: 'N/A (Tempo)' });
    } else {
      try {
        contractBalances.push({
          label,
          address,
          balance: await castBalance(rpc.url, address),
        });
      } catch {
        contractBalances.push({ label, address, balance: 'RPC error' });
      }
    }
  }

  const allowlists = readChainAllowlists(ALLOWLISTS_PATH, String(chain.chainId));
  const onchain = await loadOnchain(rpc.url, deployed, allowlists);
  const warRoom = await loadWarRoomStatus(chain.chainId, escrow, mm);

  return {
    chain: { ...chain, rpcUrl: chain.rpcUrlPublic },
    chains: chains.map((c) => ({ ...c, rpcUrl: c.rpcUrlPublic })),
    rpc: { host: rpc.host, fallback: rpc.fallback },
    deployed,
    allowlists,
    history,
    balances: [...balances, ...contractBalances.map((c) => ({ ...c, escrowRole: '', mmRole: '' }))],
    signerRoles,
    onchain,
    warRoom,
  };
}

function spawnScript(argv: string[], label: string, extraEnv: Record<string, string> = {}) {
  if (running || estimating) {
    throw new Error('A command is already running');
  }
  const child = spawn('bash', argv, {
    cwd: CONTRACTS_ROOT,
    env: withFoundryPath({
      ...process.env,
      FOUNDRY_DISABLE_NIGHTLY_WARNING: '1',
      ...extraEnv,
    }),
  });
  running = child;
  console.log(`--- start ${label} ---`);
  broadcast('start', label);
  const onChunk = (buf: Buffer) => {
    for (const line of buf.toString('utf8').split(/\r?\n/)) {
      if (line.length) emitLog(line);
    }
  };
  child.stdout.on('data', onChunk);
  child.stderr.on('data', onChunk);
  child.on('close', (code) => {
    running = null;
    if (code === 0 && pendingCustomPersist && label.startsWith('deploy ')) {
      try {
        saveCustomChain(CUSTOM_CHAINS_PATH, pendingCustomPersist.chainId, pendingCustomPersist);
        emitLog(`Saved custom chain ${pendingCustomPersist.chainId} → deployData/customChains.json`);
      } catch (err) {
        emitLog(
          `Could not save customChains.json: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    pendingCustomPersist = null;
    const done = `exit ${code ?? 'null'}`;
    console.log(`--- done ${done} ---`);
    broadcast('done', done);
  });
  child.on('error', (err) => {
    running = null;
    pendingCustomPersist = null;
    emitLog(err.message);
    console.log('--- done exit spawn-error ---');
    broadcast('done', 'exit spawn-error');
  });
}

function catalogFn(contract: string, name: string): CatalogFn | undefined {
  return CATALOG.find((f) => f.contract === contract && f.name === name && f.kind === 'view');
}

async function handleRun(body: Record<string, unknown>) {
  const action = String(body.action ?? '');
  const target = String(body.target ?? '');
  const chain = await chainFromBody(body);
  const chainId = String(chain.chainId);
  // War Room register is HTTP only (no on-chain tx) — skip mainnet name confirm
  if (
    action !== 'register-war-room'
    && chain.networkType === 'mainnets'
    && String(body.confirmName ?? '').toLowerCase() !== chain.name.toLowerCase()
  ) {
    throw new Error(`Mainnet confirm failed. Type "${chain.name}"`);
  }
  const contract =
    body.contract === 'escrow' || body.contract === 'merchant-manager' ? body.contract : '';
  const args = Array.isArray(body.args) ? body.args.map((a) => String(a)) : [];
  if (args.length > 8) throw new Error('Too many args');

  const preferredRpc = typeof body.rpcUrl === 'string' ? body.rpcUrl.trim() : '';
  const rpc = await resolveWorkingRpc(chain, preferredRpc || undefined);
  const tempoFeeToken = tempoFeeTokenFromBody(chain, body);
  const extraEnv = scriptEnvFor(chain, rpc.url, tempoFeeToken);
  emitLog(`RPC ${rpc.host}${rpc.fallback ? ' (chainlist fallback)' : ''}`);
  if (isTempoChainId(chain.chainId)) {
    await assertForgeTempoSupportAsync();
    emitLog(`Tempo fee token ${tempoFeeToken} (forge --tempo.fee-token)`);
  }

  if (action === 'deploy') {
    if (!DEPLOY_TARGETS.has(target)) throw new Error('Invalid deploy target');
    const allowlists: ChainAllowlists = {
      swapRouters: normalizeAddressList(body.swapRouters, 'swap routers'),
      bridgeRouters: normalizeAddressList(body.bridgeRouters, 'bridge routers'),
      settlementTokens: normalizeAddressList(body.settlementTokens, 'settlement tokens'),
    };
    const { quote, maxFeeWei } = takeQuote({
      quoteId: body.quoteId,
      bump: body.bump,
      chainId,
      target,
      allowlists,
      tempoFeeToken,
    });
    writeChainAllowlists(ALLOWLISTS_PATH, chainId, allowlists);
    pendingCustomPersist = {
      chainId: chain.chainId,
      rpcUrl: rpc.url,
      name: chain.name,
      explorerUrl: chain.explorerUrl,
      nativeCurrency: chain.nativeCurrency,
      networkType: chain.networkType,
    };
    spawnScript(
      [join(CONTRACTS_ROOT, 'script/deploy.sh'), chainId, target],
      `deploy ${target} ${chainId}`,
      {
        ...extraEnv,
        DEPLOY_SWAP_ROUTERS: allowlists.swapRouters,
        DEPLOY_BRIDGE_ROUTERS: allowlists.bridgeRouters,
        DEPLOY_SETTLEMENT_TOKENS: allowlists.settlementTokens,
        DEPLOY_WITH_GAS_PRICE: maxFeeWei.toString(),
        DEPLOY_PRIORITY_GAS_PRICE: quote.priorityFeeWei.toString(),
        DEPLOY_GAS_ESTIMATE_MULTIPLIER: String(deployGasMultiplier(chain.chainId)),
      },
    );
    return;
  }
  if (action === 'roles') {
    if (!ROLES_TARGETS.has(target)) throw new Error('Invalid roles command');
    spawnScript(
      [join(CONTRACTS_ROOT, 'script/roles.sh'), chainId, target],
      `roles ${target} ${chainId}`,
      extraEnv,
    );
    return;
  }
  if (action === 'register-war-room') {
    const scriptName = WAR_ROOM_SCRIPT_BY_TARGET[target];
    if (!scriptName) throw new Error('Invalid War Room register target');
    const env = readAllowlistedEnv(ENV_PATH, EXAMPLE_PATH);
    if (!(env.WAR_ROOM_URL ?? '').trim()) {
      throw new Error('WAR_ROOM_URL is unset — set it in Env');
    }
    if (!(env.WAR_ROOM_DEPLOY_API_KEY ?? '').trim()) {
      throw new Error('WAR_ROOM_DEPLOY_API_KEY is unset — set it in Env');
    }
    const addresses = loadAddresses(ADDRESSES_PATH)[chainId] ?? {};
    if (!addresses.NodeRailsEscrow && !addresses.NodeRailsMerchantManager) {
      throw new Error('No local Escrow / MerchantManager for this chain — deploy first');
    }
    spawnScript(
      [join(CONTRACTS_ROOT, 'script/register-war-room.sh'), chainId, scriptName],
      `register-war-room ${scriptName} ${chainId}`,
      extraEnv,
    );
    return;
  }
  if (action === 'settings') {
    if (!SETTINGS_TARGETS.has(target)) throw new Error('Invalid settings command');
    if (DANGER_SETTINGS.has(target) && body.confirmDanger !== true) {
      throw new Error('Dangerous command requires confirmDanger');
    }
    const argv = [join(CONTRACTS_ROOT, 'script/settings.sh'), chainId, target, ...args];
    if (contract) argv.push('--contract', contract);
    spawnScript(argv, `settings ${target} ${chainId}`, extraEnv);
    return;
  }
  throw new Error('Unknown action');
}

const server = createServer(async (req, res) => {
  try {
    const host = req.headers.host ?? '';
    if (host && !host.startsWith('127.0.0.1') && !host.startsWith('localhost')) {
      json(res, 403, { error: 'localhost only' });
      return;
    }
    const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(pageHtml());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/catalog') {
      json(res, 200, { functions: CATALOG, matrix: MATRIX });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/env') {
      json(res, 200, { values: readAllowlistedEnv(ENV_PATH, EXAMPLE_PATH) });
      return;
    }

    if (req.method === 'PUT' && url.pathname === '/api/env') {
      const body = JSON.parse(await readBody(req)) as { values?: Record<string, string> };
      if (!body.values || typeof body.values !== 'object') throw new Error('values required');
      const values = mergeEnvFile(ENV_PATH, EXAMPLE_PATH, body.values);
      json(res, 200, { values });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      const state = await loadState(
        url.searchParams.get('chainId') ?? '',
        url.searchParams.get('rpcUrl') ?? undefined,
        {
          chainName: url.searchParams.get('chainName') ?? undefined,
          explorerUrl: url.searchParams.get('explorerUrl') ?? undefined,
          nativeCurrency: url.searchParams.get('nativeCurrency') ?? undefined,
          networkType: url.searchParams.get('networkType') ?? undefined,
        },
      );
      json(res, 200, state);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/chainlist') {
      const catalog = await getChainlistCatalog();
      json(res, 200, { items: catalog, source: 'https://chainlist.org/rpcs.json' });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/rpc/probe') {
      const body = JSON.parse((await readBody(req)) || '{}') as {
        chainId?: number | string;
        rpcUrl?: string;
      };
      const chainId = Number(body.chainId);
      const rpcUrl = String(body.rpcUrl ?? '').trim();
      if (!Number.isFinite(chainId) || chainId <= 0) throw new Error('chainId required');
      if (!rpcUrl.startsWith('https://')) throw new Error('rpcUrl must be https');
      const ok = await probeRpc(rpcUrl, chainId);
      json(res, 200, { ok, chainId, rpcUrl, host: rpcHost(rpcUrl) });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/addresses') {
      const rows = loadAddressBook(CHAINS_PATH, ADDRESSES_PATH, CUSTOM_CHAINS_PATH, ABIS_PATH);
      const annotated = await annotateAddressBookWarRoom(rows);
      json(res, 200, annotated);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/abi') {
      const chainId = url.searchParams.get('chainId') ?? '';
      const contract = url.searchParams.get('contract') ?? '';
      if (contract !== 'NodeRailsEscrow' && contract !== 'NodeRailsMerchantManager') {
        throw new Error('contract must be NodeRailsEscrow or NodeRailsMerchantManager');
      }
      const abi = getContractAbi(ABIS_PATH, chainId, contract);
      if (!abi) throw new Error(`No ABI for ${contract} on chain ${chainId}`);
      json(res, 200, { chainId: Number(chainId) || chainId, contract, abi });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/run/stream') {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });
      res.write('event: hello\ndata: connected\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/deploy/estimate') {
      const body = JSON.parse((await readBody(req)) || '{}') as Record<string, unknown>;
      const target = String(body.target ?? '');
      const chain = await chainFromBody(body);
      const chainId = String(chain.chainId);
      if (!DEPLOY_TARGETS.has(target)) throw new Error('Invalid deploy target');
      if (running || estimating) throw new Error('A command is already running');
      const allowlists: ChainAllowlists = {
        swapRouters: normalizeAddressList(body.swapRouters, 'swap routers'),
        bridgeRouters: normalizeAddressList(body.bridgeRouters, 'bridge routers'),
        settlementTokens: normalizeAddressList(body.settlementTokens, 'settlement tokens'),
      };
      writeChainAllowlists(ALLOWLISTS_PATH, chainId, allowlists);
      const preferredRpc = typeof body.rpcUrl === 'string' ? body.rpcUrl.trim() : '';
      const tempoFeeToken = tempoFeeTokenFromBody(chain, body);
      const rpc = await resolveWorkingRpc(chain, preferredRpc || undefined);
      estimating = true;
      emitLog(`Estimating deploy fee on ${chain.name} via ${rpc.host}`);
      if (isTempoChainId(chain.chainId)) {
        await assertForgeTempoSupportAsync();
      }
      try {
        const [fees, dry] = await Promise.all([
          readNetworkFees(rpc.url),
          runDeployDryRun({
            scriptPath: join(CONTRACTS_ROOT, 'script/deploy.sh'),
            cwd: CONTRACTS_ROOT,
            chainId,
            target,
            env: withFoundryPath({
              ...process.env,
              FOUNDRY_DISABLE_NIGHTLY_WARNING: '1',
              ...scriptEnvFor(chain, rpc.url, tempoFeeToken),
              DEPLOY_DRY_RUN: '1',
              DEPLOY_SWAP_ROUTERS: allowlists.swapRouters,
              DEPLOY_BRIDGE_ROUTERS: allowlists.bridgeRouters,
              DEPLOY_SETTLEMENT_TOKENS: allowlists.settlementTokens,
              DEPLOY_GAS_ESTIMATE_MULTIPLIER: String(deployGasMultiplier(chain.chainId)),
            }),
          }),
        ]);
        const view = storeQuote({
          id: newQuoteId(),
          at: Date.now(),
          chainId,
          target,
          allowlists,
          tempoFeeToken,
          gasUsed: dry.gasUsed,
          baseFeeWei: fees.baseFeeWei,
          priorityFeeWei: fees.priorityFeeWei,
          nativeCurrency: chain.nativeCurrency === 'MATIC' ? 'POL' : chain.nativeCurrency,
        });
        emitLog(`Estimate ${view.gasUsed} gas. Minimum cap ${view.bumps[0]?.maxNative ?? ''}.`);
        json(res, 200, view);
      } finally {
        estimating = false;
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/run') {
      const body = JSON.parse(await readBody(req) || '{}') as Record<string, unknown>;
      await handleRun(body);
      json(res, 202, { ok: true, running: true });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/call') {
      const body = JSON.parse(await readBody(req) || '{}') as Record<string, unknown>;
      const chain = await chainFromBody(body);
      const fn = catalogFn(String(body.contract ?? ''), String(body.function ?? ''));
      if (!fn) throw new Error('Unknown view function');
      const sig = VIEW_SIG[fn.name];
      if (!sig) throw new Error('No cast signature');
      const deployed = loadAddresses(ADDRESSES_PATH)[String(chain.chainId)] ?? {};
      const to =
        fn.contract === 'escrow' ? deployed.NodeRailsEscrow : deployed.NodeRailsMerchantManager;
      if (!to) throw new Error('Contract not deployed');
      const args = Array.isArray(body.args) ? body.args.map(String) : [];
      if (args.length !== fn.args.length) throw new Error('Arg count mismatch');
      const preferredRpc = typeof body.rpcUrl === 'string' ? body.rpcUrl.trim() : '';
      const rpc = await resolveWorkingRpc(chain, preferredRpc || undefined);
      const result = await castCall(rpc.url, to, sig, args);
      json(res, 200, { result: redact(result) });
      return;
    }

    json(res, 404, { error: 'not found' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error';
    if (!res.headersSent) json(res, 400, { error: redact(message) });
  }
});

if (process.env.HOST && process.env.HOST !== '127.0.0.1' && process.env.HOST !== 'localhost') {
  throw new Error('Ops UI binds 127.0.0.1 only');
}

server.listen(PORT, HOST, () => {
  const forge = resolveForgeExecutable(withFoundryPath());
  console.log(`Foundry ops UI http://${HOST}:${PORT}  (cwd ${CONTRACTS_ROOT})`);
  console.log(`Forge for deploy scripts: ${forge}`);
});
