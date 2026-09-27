'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  LoaderCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Toggle } from '@/components/ui';
import { saveMerchantWalletConfig } from '@/lib/save-merchant-wallet';
import {
  createPasskey,
  deriveSettlementAddresses,
  loadStoredCredential,
  ownershipMessage,
  meraErrorCode,
  persistPasskeyCredential,
  signOwnershipMessage,
  toMeraErrorMessage,
  unlockPasskey,
  wipeBytes,
  type MeraPasskeySession,
  type MeraSettlementAddresses,
} from '@/lib/mera-wallet';

type Step = 'intro' | 'prompt' | 'review' | 'backup';

const STEP_LABELS = ['Passkey', 'Wallets', 'Backup'] as const;

export function usePasskeyAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    setAvailable(typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function');
  }, []);
  return available;
}

type PasskeyMode = 'create' | 'unlock-stored' | 'unlock-any';

function stepIndex(step: Step) {
  if (step === 'intro' || step === 'prompt') return 0;
  if (step === 'review') return 1;
  return 2;
}

export function PasskeyWalletDialog({
  open,
  onOpenChange,
  merchantId,
  merchantEmail,
  displayName,
  token,
  appId,
  appName,
  appEnv,
  evmChainNames,
  solanaEnabled,
  replacingExisting,
  onSaved,
  onFinished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  merchantEmail: string;
  displayName: string;
  token: string;
  appId: string;
  appName: string;
  appEnv: 'TEST' | 'PRODUCTION';
  evmChainNames: string[];
  solanaEnabled: boolean;
  replacingExisting: boolean;
  onSaved: (app?: unknown) => void;
  onFinished?: () => void;
}) {
  const stored = merchantId ? loadStoredCredential(merchantId) : null;
  const [step, setStep] = useState<Step>('intro');
  const [error, setError] = useState('');
  const [session, setSession] = useState<MeraPasskeySession | null>(null);
  const [addresses, setAddresses] = useState<MeraSettlementAddresses | null>(null);
  const [includeSolana, setIncludeSolana] = useState(solanaEnabled);
  const [saving, setSaving] = useState(false);
  const [evmSaved, setEvmSaved] = useState(false);
  const [solanaError, setSolanaError] = useState('');
  const [phraseRevealed, setPhraseRevealed] = useState(false);
  const [phraseSaved, setPhraseSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [viewingPhraseOnly, setViewingPhraseOnly] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [lastMode, setLastMode] = useState<PasskeyMode | null>(null);
  const [canRetry, setCanRetry] = useState(false);

  const reset = () => {
    wipeBytes(session?.prfOutput);
    setStep('intro');
    setError('');
    setSession(null);
    setAddresses(null);
    setIncludeSolana(solanaEnabled);
    setSaving(false);
    setEvmSaved(false);
    setSolanaError('');
    setPhraseRevealed(false);
    setPhraseSaved(false);
    setCopied(null);
    setViewingPhraseOnly(false);
    setSavedOk(false);
    setLastMode(null);
    setCanRetry(false);
  };

  useEffect(() => {
    if (open) {
      setIncludeSolana(solanaEnabled);
    }
  }, [open, solanaEnabled]);

  const backupLocked = step === 'backup' && !viewingPhraseOnly && savedOk;

  const close = (nextOpen: boolean) => {
    if (saving) return;
    if (!nextOpen && backupLocked) return;
    const finished = savedOk && !nextOpen;
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
    if (finished) onFinished?.();
  };

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 2000);
  };

  const runPasskey = async (mode: PasskeyMode) => {
    setError('');
    setCanRetry(false);
    setLastMode(mode);
    setStep('prompt');
    try {
      const next =
        mode === 'create'
          ? await createPasskey({ email: merchantEmail, displayName })
          : await unlockPasskey({
              merchantId,
              useStored: mode === 'unlock-stored',
            });
      const derived = await deriveSettlementAddresses(next.prfOutput);
      persistPasskeyCredential(merchantId, next, derived);
      setSession(next);
      setAddresses(derived);
      setStep('review');
    } catch (err) {
      setError(toMeraErrorMessage(err));
      setCanRetry(meraErrorCode(err) === 'PASSKEY_OPERATION_FAILED');
      setStep('intro');
    }
  };

  const saveFamily = async (family: 'EVM' | 'SOLANA') => {
    if (!session || !addresses) return;
    const address = family === 'EVM' ? addresses.evmAddress : addresses.solanaAddress;
    const signature = await signOwnershipMessage(
      session.prfOutput,
      family,
      ownershipMessage({ appName, family, address }),
    );
    return saveMerchantWalletConfig({
      token,
      appId,
      appEnv,
      walletType: 'receiving',
      family,
      address,
      signature,
    });
  };

  const handleSave = async () => {
    if (!session || !addresses) return;
    setSaving(true);
    setError('');
    setSolanaError('');
    try {
      let lastApp: unknown;
      if (!evmSaved) {
        lastApp = await saveFamily('EVM');
        setEvmSaved(true);
      }
      if (includeSolana) {
        try {
          lastApp = await saveFamily('SOLANA');
        } catch (err) {
          setSolanaError(err instanceof Error ? err.message : 'Failed to save Solana');
          return;
        }
      }
      persistPasskeyCredential(merchantId, session, addresses);
      setSavedOk(true);
      if (session.created) {
        setViewingPhraseOnly(false);
        setStep('backup');
        onSaved(lastApp);
        return;
      }
      reset();
      onOpenChange(false);
      onSaved(lastApp);
      onFinished?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save wallets');
    } finally {
      setSaving(false);
    }
  };

  const finishBackup = () => {
    reset();
    onOpenChange(false);
    onFinished?.();
  };

  const activeIndex = stepIndex(step);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        overlayClassName="z-[80]"
        className="z-[80] sm:max-w-md"
        showCloseButton={!saving && !backupLocked}
      >
        <DialogHeader>
          <DialogTitle>
            {step === 'backup' ? 'Save your recovery phrase' : 'Create wallets with a passkey'}
          </DialogTitle>
          <DialogDescription>
            {step === 'backup'
              ? 'This passkey only works on this dashboard domain. The phrase is the only way to move funds later. Import it into MetaMask or Rabby for the same EVM address.'
              : 'One passkey. Wallets on every chain.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          {STEP_LABELS.map((label, index) => {
            const done = index < activeIndex;
            const current = index === activeIndex;
            return (
              <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : current
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : index + 1}
                </div>
                <span className={`truncate text-[11px] font-medium ${current ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
                {index < STEP_LABELS.length - 1 && (
                  <div className={`h-px flex-1 ${done ? 'bg-emerald-500' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-4">
                <div className="flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Fingerprint className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {['Monad', 'Ethereum', 'Base', 'any EVM chain', 'Solana'].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <ul className="space-y-1.5 text-[13px] text-foreground/80">
                <li>No wallet extension to install.</li>
                <li>No seed phrase to type during setup.</li>
                <li>Keys stay on this device.</li>
              </ul>
              <p className="text-[12px] text-foreground/65">
                Use iCloud Keychain, 1Password, or Google Password Manager. Desktop Chrome only returns a usable passkey from Google Password Manager.
              </p>
            </motion.div>
          )}

          {step === 'prompt' && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col items-center gap-3 py-6"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Fingerprint className="h-7 w-7 animate-pulse text-primary" />
              </div>
              <p className="text-center text-[13px] text-foreground/80">
                Confirm with Face ID, Touch ID, or your security key.
              </p>
            </motion.div>
          )}

          {step === 'review' && addresses && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="space-y-3"
            >
              {replacingExisting && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="text-xs text-amber-800">
                    <p className="font-medium">You are replacing an existing address</p>
                    <p className="mt-0.5">In-flight captures may still use the old address until new payments use this one.</p>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/65">EVM</p>
                    <p className="mt-0.5 break-all font-mono text-[13px] text-foreground">
                      {addresses.evmAddress}
                    </p>
                    <p className="mt-1 text-[12px] text-foreground/70">Works on Monad and every EVM chain</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copy(addresses.evmAddress, 'evm')}
                    className="shrink-0 rounded-md p-1 hover:bg-muted"
                  >
                    {copied === 'evm' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
                {evmChainNames.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {evmChainNames.map((name) => (
                      <span key={name} className="rounded-md bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground/75">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/65">Solana</p>
                    <p className="mt-0.5 break-all font-mono text-[13px] text-foreground">
                      {addresses.solanaAddress}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copy(addresses.solanaAddress, 'sol')}
                    className="shrink-0 rounded-md p-1 hover:bg-muted"
                  >
                    {copied === 'sol' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">Also receive on Solana</p>
                    {!solanaEnabled && (
                      <p className="text-[12px] text-foreground/65">Turning this on enables Solana for this app.</p>
                    )}
                  </div>
                  <Toggle checked={includeSolana} onChange={setIncludeSolana} />
                </div>
                {evmSaved && solanaError && (
                  <p className="text-[12px] text-destructive">EVM saved. Solana failed: {solanaError}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewingPhraseOnly(true);
                  setStep('backup');
                }}
                className="text-[12px] font-medium text-primary underline-offset-2 hover:underline"
              >
                View recovery phrase
              </button>
            </motion.div>
          )}

          {step === 'backup' && addresses && (
            <motion.div
              key="backup"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="space-y-3"
            >
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                Write these 24 words down. This phrase is the only way to move funds later. If this dashboard moves to another domain, the passkey cannot recover the wallets.
              </div>
              <div className="relative rounded-lg border border-border bg-muted/40 px-3 py-3">
                {phraseRevealed ? (
                  <p className="break-words font-mono text-[13px] leading-relaxed text-foreground">
                    {addresses.mnemonic}
                  </p>
                ) : (
                  <p className="font-mono text-[13px] leading-relaxed text-foreground/45">
                    •••• •••• •••• •••• •••• ••••
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPhraseRevealed((value) => !value)}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground/80 hover:text-foreground"
                  >
                    {phraseRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {phraseRevealed ? 'Hide' : 'Reveal'}
                  </button>
                  <button
                    type="button"
                    disabled={!phraseRevealed}
                    onClick={() => void copy(addresses.mnemonic, 'phrase')}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground/80 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copied === 'phrase' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy
                  </button>
                </div>
              </div>
              {!viewingPhraseOnly && (
                <label className="flex items-start gap-2 text-[13px] text-foreground/80">
                  <input
                    type="checkbox"
                    checked={phraseSaved}
                    onChange={(e) => setPhraseSaved(e.target.checked)}
                    className="mt-0.5"
                  />
                  I saved it somewhere safe
                </label>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          {step === 'intro' && (
            <div className="flex w-full flex-col gap-2">
              {stored ? (
                <Button type="button" onClick={() => void runPasskey('unlock-stored')}>
                  <Fingerprint className="h-4 w-4" />
                  Unlock with passkey
                </Button>
              ) : (
                <Button type="button" onClick={() => void runPasskey('create')}>
                  <Fingerprint className="h-4 w-4" />
                  Create passkey
                </Button>
              )}
              <button
                type="button"
                onClick={() => void runPasskey(stored ? 'create' : 'unlock-any')}
                className="text-center text-[12px] font-medium text-primary underline-offset-2 hover:underline"
              >
                {stored ? 'Create a new passkey' : 'I already have a NodeRails passkey'}
              </button>
              {canRetry && lastMode && (
                <Button type="button" variant="secondary" onClick={() => void runPasskey(lastMode)}>
                  Try again
                </Button>
              )}
            </div>
          )}

          {step === 'prompt' && (
            <Button type="button" variant="secondary" onClick={() => setStep('intro')}>
              Cancel
            </Button>
          )}

          {step === 'review' && (
            <>
              <Button type="button" variant="secondary" onClick={() => close(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {saving
                  ? 'Saving…'
                  : evmSaved && solanaError
                    ? 'Retry Solana'
                    : replacingExisting
                      ? 'Replace and save'
                      : 'Sign and save'}
              </Button>
            </>
          )}

          {step === 'backup' && viewingPhraseOnly && (
            <Button type="button" variant="secondary" onClick={() => setStep('review')}>
              Back
            </Button>
          )}

          {step === 'backup' && !viewingPhraseOnly && (
            <Button type="button" disabled={!phraseSaved} onClick={finishBackup}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
