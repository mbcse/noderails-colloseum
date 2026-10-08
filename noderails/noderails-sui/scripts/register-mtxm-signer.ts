/**
 * Register MTXM Sui signer on EscrowConfig (transaction authority + Ed25519 auth key).
 *
 * Usage:
 *   SUI_DEPLOYER_PRIVATE_KEY=... tsx scripts/register-mtxm-signer.ts
 *
 * Or uses ~/.sui/sui_config/sui.keystore when env key is unset.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64 } from '@mysten/sui/utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUI_ROOT = path.resolve(__dirname, '..');

const MTXM_SIGNER_ADDRESS = '0x54591a3a28ea92720185b700b6a2fa1a0f1c94e04c74808750d8eb5cfb8af343';
const MTXM_SIGNER_PUBKEY_B64 = 'pV8s0L//kyKtwfHBgud5YoWDl36/DOi5WOdAAau4IS8=';

/** Existing testnet entries from deploy.testnet.json — kept when adding MTXM signer. */
const EXISTING_TX_AUTHORITIES = [
  '0x0661bcf5cf7be98816ba52dfc965fa180b88d65b8cc1c99897a36ad2eb338587',
];
const EXISTING_NODERAILS_KEYS_B64 = ['Kg0aONEoAY7Y42G50nQ2GU8tcNpusHpN+yeUkqeWvhE='];

function loadPublished(): {
  escrowPackageId: string;
  escrowConfigObjectId: string;
  network: string;
} {
  const p = path.join(SUI_ROOT, 'deployData/published.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as {
    escrowPackageId: string;
    escrowConfigObjectId: string;
    network: string;
  };
  if (!raw.escrowPackageId || !raw.escrowConfigObjectId) {
    throw new Error('deployData/published.json missing escrowPackageId or escrowConfigObjectId');
  }
  return raw;
}

function keypairFromSecretBytes(bytes: Uint8Array): Ed25519Keypair {
  if (bytes.length === 33) return Ed25519Keypair.fromSecretKey(bytes.slice(1));
  if (bytes.length === 32) return Ed25519Keypair.fromSecretKey(bytes);
  throw new Error(`Invalid secret key length: ${bytes.length}`);
}

function resolveKeypair(): Ed25519Keypair {
  const fromEnv = process.env.SUI_DEPLOYER_PRIVATE_KEY?.trim();
  if (fromEnv) {
    if (fromEnv.startsWith('suiprivkey')) return Ed25519Keypair.fromSecretKey(fromEnv);
    const bytes = fromEnv.startsWith('0x')
      ? new Uint8Array(Buffer.from(fromEnv.slice(2), 'hex'))
      : fromBase64(fromEnv);
    return keypairFromSecretBytes(bytes);
  }
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
  const keyPath = path.join(home, '.sui', 'sui_config', 'sui.keystore');
  if (!fs.existsSync(keyPath)) {
    throw new Error('Set SUI_DEPLOYER_PRIVATE_KEY or configure ~/.sui/sui_config/sui.keystore');
  }
  const keystore = JSON.parse(fs.readFileSync(keyPath, 'utf8')) as string[];
  const entry = keystore[0];
  if (!entry) throw new Error('Empty Sui keystore');
  if (entry.startsWith('suiprivkey')) return Ed25519Keypair.fromSecretKey(entry);
  return keypairFromSecretBytes(fromBase64(entry));
}

function uniqueAddresses(addrs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of addrs) {
    const n = a.trim().toLowerCase();
    if (!seen.has(n)) {
      seen.add(n);
      out.push(a.trim());
    }
  }
  return out;
}

function uniqueKeysB64(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    const t = k.trim();
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

async function main() {
  const published = loadPublished();
  const rpc =
    published.network === 'mainnet'
      ? getFullnodeUrl('mainnet')
      : published.network === 'testnet'
        ? getFullnodeUrl('testnet')
        : getFullnodeUrl('devnet');
  const client = new SuiClient({ url: rpc });
  const keypair = resolveKeypair();
  const sender = keypair.toSuiAddress();

  const txAuthorities = uniqueAddresses([...EXISTING_TX_AUTHORITIES, MTXM_SIGNER_ADDRESS]);
  const noderailsKeysB64 = uniqueKeysB64([...EXISTING_NODERAILS_KEYS_B64, MTXM_SIGNER_PUBKEY_B64]);
  const noderailsKeyBytes = noderailsKeysB64.map((k) => Array.from(fromBase64(k)));

  console.log('Registering MTXM signer on EscrowConfig');
  console.log('  package:', published.escrowPackageId);
  console.log('  config:', published.escrowConfigObjectId);
  console.log('  sender (must be super_admin):', sender);
  console.log('  transaction_authorities:', txAuthorities);
  console.log('  authorized_noderails_keys (base64):', noderailsKeysB64);

  const tx = new Transaction();
  tx.setSender(sender);
  tx.moveCall({
    target: `${published.escrowPackageId}::admin::set_transaction_authorities`,
    arguments: [tx.object(published.escrowConfigObjectId), tx.pure.vector('address', txAuthorities)],
  });
  tx.moveCall({
    target: `${published.escrowPackageId}::admin::set_authorized_noderails_keys`,
    arguments: [
      tx.object(published.escrowConfigObjectId),
      tx.pure.vector('vector<u8>', noderailsKeyBytes),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true },
  });

  if (result.effects?.status?.status !== 'success') {
    throw new Error(`On-chain update failed: ${result.effects?.status?.error ?? 'unknown'}`);
  }

  console.log('Success. Digest:', result.digest);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
