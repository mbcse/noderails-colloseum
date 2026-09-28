import { HDKey } from '@scure/bip32';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { bytesToHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { PasskeyCredentialMetadata, PasskeySecretVault } from '@category-labs/mera';

export type MeraStoredCredential = {
  credentialId: string;
  transports?: PasskeyCredentialMetadata['transports'];
  evmAddress: string;
  solanaAddress: string;
};

export type MeraPasskeySession = {
  prfOutput: Uint8Array;
  credentialId: string;
  transports?: PasskeyCredentialMetadata['transports'];
  created: boolean;
};

export type MeraSettlementAddresses = {
  evmAddress: string;
  solanaAddress: string;
  mnemonic: string;
};

export type MeraTypedData = {
  domain: Record<string, unknown>;
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
};

const CREDENTIAL_PREFIX = 'noderails.mera.v1.';
const VAULT_PREFIX = 'noderails.vault.v1.';
const HARDENED = 0x80000000;
const SOLANA_PATH = [44, 501, 0, 0] as const;

function loadMera() {
  return import('@category-labs/mera');
}

function loadMeraViem() {
  return import('@category-labs/mera/viem');
}

export function wipeBytes(bytes: Uint8Array | null | undefined) {
  bytes?.fill(0);
}

export function isPasskeyAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function';
}

function credentialStoreKey(merchantId: string) {
  return `${CREDENTIAL_PREFIX}${merchantId}`;
}

function vaultStoreKey(appId: string, secretId: string) {
  return `${VAULT_PREFIX}${appId}.${secretId}`;
}

export function loadStoredCredential(merchantId: string): MeraStoredCredential | null {
  if (typeof window === 'undefined' || !merchantId) return null;
  try {
    const raw = window.localStorage.getItem(credentialStoreKey(merchantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MeraStoredCredential;
    if (!parsed?.credentialId || !parsed.evmAddress) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredCredential(merchantId: string, credential: MeraStoredCredential) {
  if (typeof window === 'undefined' || !merchantId) return;
  window.localStorage.setItem(credentialStoreKey(merchantId), JSON.stringify(credential));
}

export function hasVault(appId: string, secretId: string): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.localStorage.getItem(vaultStoreKey(appId, secretId)));
}

export function dropVault(appId: string, secretId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(vaultStoreKey(appId, secretId));
}

function readVault(appId: string, secretId: string): unknown {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(vaultStoreKey(appId, secretId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeVault(appId: string, secretId: string, vault: PasskeySecretVault) {
  window.localStorage.setItem(vaultStoreKey(appId, secretId), JSON.stringify(vault));
}

export function meraErrorCode(err: unknown): string {
  return err && typeof err === 'object' && 'code' in err
    ? String((err as { code?: string }).code)
    : '';
}

export function toMeraErrorMessage(err: unknown): string {
  const code = meraErrorCode(err);
  switch (code) {
    case 'PRF_UNAVAILABLE':
      return 'This passkey provider cannot create wallets. On desktop Chrome, save the passkey to Google Password Manager, or use iCloud Keychain or 1Password.';
    case 'PASSKEY_OPERATION_FAILED':
      return 'The prompt was closed.';
    case 'CRYPTO_UNAVAILABLE':
      return 'Open the dashboard over HTTPS.';
    case 'SESSION_ENDED':
      return 'The passkey session ended. Try again.';
    case 'DECRYPT_FAILED':
      return 'This passkey could not unlock the secret.';
    case 'VAULT_FORMAT_INVALID':
      return 'The locked secret on this browser is unreadable.';
    default:
      return err instanceof Error ? err.message : 'Passkey failed';
  }
}

export function recoveryPhrase(prfOutput: Uint8Array): string {
  return entropyToMnemonic(prfOutput, wordlist);
}

function copyKey(source: Uint8Array): Uint8Array {
  return new Uint8Array(source);
}

function deriveEvmPrivateKey(prfOutput: Uint8Array): Uint8Array {
  const mnemonic = entropyToMnemonic(prfOutput, wordlist);
  const seed = mnemonicToSeedSync(mnemonic);
  try {
    const node = HDKey.fromMasterSeed(seed).derive(`m/44'/60'/0'/0/0`);
    if (!node.privateKey) throw new Error('derivation produced no key');
    return copyKey(node.privateKey);
  } finally {
    wipeBytes(seed);
  }
}

function asBufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

async function hmacSha512(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    asBufferSource(key),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, asBufferSource(data)));
}

function writeU32Be(out: Uint8Array, offset: number, value: number) {
  out[offset] = (value >>> 24) & 0xff;
  out[offset + 1] = (value >>> 16) & 0xff;
  out[offset + 2] = (value >>> 8) & 0xff;
  out[offset + 3] = value & 0xff;
}

async function slip10Master(seed: Uint8Array) {
  const I = await hmacSha512(new TextEncoder().encode('ed25519 seed'), seed);
  return { key: I.slice(0, 32), chain: I.slice(32) };
}

async function slip10Child(
  parent: { key: Uint8Array; chain: Uint8Array },
  index: number,
) {
  const data = new Uint8Array(37);
  data[0] = 0;
  data.set(parent.key, 1);
  writeU32Be(data, 33, (index | HARDENED) >>> 0);
  const I = await hmacSha512(parent.chain, data);
  wipeBytes(data);
  return { key: I.slice(0, 32), chain: I.slice(32) };
}

async function deriveSolanaPrivateKey(prfOutput: Uint8Array): Promise<Uint8Array> {
  const mnemonic = entropyToMnemonic(prfOutput, wordlist);
  const seed = mnemonicToSeedSync(mnemonic);
  try {
    let node = await slip10Master(seed);
    for (const index of SOLANA_PATH) {
      const next = await slip10Child(node, index);
      wipeBytes(node.key);
      wipeBytes(node.chain);
      node = next;
    }
    const key = copyKey(node.key);
    wipeBytes(node.key);
    wipeBytes(node.chain);
    return key;
  } finally {
    wipeBytes(seed);
  }
}

export async function deriveSettlementAddresses(
  prfOutput: Uint8Array,
): Promise<MeraSettlementAddresses> {
  const mera = await loadMera();
  const evmKey = deriveEvmPrivateKey(prfOutput);
  const solKey = await deriveSolanaPrivateKey(prfOutput);
  const solSession = mera.createEd25519SigningSession({ privateKey: solKey });
  try {
    return {
      evmAddress: privateKeyToAccount(bytesToHex(evmKey)).address,
      solanaAddress: mera.getSolanaAddress(solSession.publicKey),
      mnemonic: recoveryPhrase(prfOutput),
    };
  } finally {
    solSession.end();
    wipeBytes(evmKey);
    wipeBytes(solKey);
  }
}

function relyingParty() {
  return { id: window.location.hostname, name: 'NodeRails' };
}

export async function createPasskey(params: {
  email: string;
  displayName: string;
}): Promise<MeraPasskeySession> {
  const mera = await loadMera();
  const created = await mera.createPasskeyWithPrfOutput({
    rp: relyingParty(),
    user: {
      name: params.email,
      displayName: params.displayName,
    },
  });
  return {
    prfOutput: created.prfOutput,
    credentialId: created.credentialId,
    transports: created.transports,
    created: true,
  };
}

export async function unlockPasskey(params: {
  merchantId: string;
  useStored?: boolean;
}): Promise<MeraPasskeySession> {
  const mera = await loadMera();
  const stored = params.useStored ? loadStoredCredential(params.merchantId) : null;
  const unlocked = await mera.getPasskeyPrfOutput({
    rpId: window.location.hostname,
    credential: stored
      ? { credentialId: stored.credentialId, transports: stored.transports }
      : undefined,
  });
  return {
    prfOutput: unlocked.prfOutput,
    credentialId: unlocked.credentialId,
    transports: stored?.transports,
    created: false,
  };
}

export function persistPasskeyCredential(
  merchantId: string,
  session: MeraPasskeySession,
  addresses: Pick<MeraSettlementAddresses, 'evmAddress' | 'solanaAddress'>,
) {
  saveStoredCredential(merchantId, {
    credentialId: session.credentialId,
    transports: session.transports,
    evmAddress: addresses.evmAddress,
    solanaAddress: addresses.solanaAddress,
  });
}

export function ownershipMessage(params: {
  appName: string;
  family: 'EVM' | 'SOLANA';
  address: string;
}) {
  const networkLabel = params.family === 'EVM' ? 'EVM' : 'Solana';
  return `I confirm that I own this ${networkLabel} wallet and authorize it as the receiving wallet for "${params.appName}" on NodeRails.\n\nWallet: ${params.address}\nTimestamp: ${new Date().toISOString()}`;
}

export async function signOwnershipMessage(
  prfOutput: Uint8Array,
  family: 'EVM' | 'SOLANA',
  message: string,
): Promise<string> {
  const mera = await loadMera();
  if (family === 'EVM') {
    const { toViemAccount } = await loadMeraViem();
    const key = deriveEvmPrivateKey(prfOutput);
    const session = mera.createSecp256k1SigningSession({ privateKey: key });
    try {
      return await toViemAccount(session).signMessage({ message });
    } finally {
      session.end();
      wipeBytes(key);
    }
  }

  const key = await deriveSolanaPrivateKey(prfOutput);
  const session = mera.createEd25519SigningSession({ privateKey: key });
  try {
    const signature = await session.signMessage(new TextEncoder().encode(message));
    return btoa(String.fromCharCode(...signature));
  } finally {
    session.end();
    wipeBytes(key);
  }
}

export async function signTypedDataWithPasskey(
  prfOutput: Uint8Array,
  typedData: MeraTypedData,
): Promise<string> {
  const mera = await loadMera();
  const { toViemAccount } = await loadMeraViem();
  const key = deriveEvmPrivateKey(prfOutput);
  const session = mera.createSecp256k1SigningSession({ privateKey: key });
  const types = { ...typedData.types };
  delete types.EIP712Domain;
  try {
    return await toViemAccount(session).signTypedData({
      domain: typedData.domain as never,
      types,
      primaryType: typedData.primaryType,
      message: typedData.message,
    });
  } finally {
    session.end();
    wipeBytes(key);
  }
}

export async function lockSecret(params: {
  merchantId: string;
  appId: string;
  secretId: string;
  secret: string;
}) {
  const mera = await loadMera();
  const stored = loadStoredCredential(params.merchantId);
  const vault = await mera.createSecretVaultWithExistingPasskey({
    rpId: window.location.hostname,
    credential: stored
      ? { credentialId: stored.credentialId, transports: stored.transports }
      : undefined,
    secret: new TextEncoder().encode(params.secret),
  });
  writeVault(params.appId, params.secretId, vault);
}

export async function revealSecret(params: {
  appId: string;
  secretId: string;
}): Promise<string> {
  const mera = await loadMera();
  const parsed = mera.parseSecretVault(readVault(params.appId, params.secretId));
  const bytes = await mera.decryptSecretVaultWithPasskey({
    rpId: window.location.hostname,
    vault: parsed,
  });
  return new TextDecoder().decode(bytes);
}
