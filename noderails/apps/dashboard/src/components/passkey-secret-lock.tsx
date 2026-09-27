'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Fingerprint, LoaderCircle } from 'lucide-react';
import {
  dropVault,
  hasVault,
  lockSecret,
  revealSecret,
  toMeraErrorMessage,
} from '@/lib/mera-wallet';

export function PasskeySecretLock({
  merchantId,
  appId,
  secretId,
  plaintext,
}: {
  merchantId: string;
  appId: string;
  secretId: string;
  plaintext?: string | null;
}) {
  const [locked, setLocked] = useState(() => hasVault(appId, secretId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocked(hasVault(appId, secretId));
  }, [appId, secretId]);

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setTimeout(() => setRevealed(null), 30_000);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  const handleLock = async () => {
    if (!plaintext) return;
    setBusy(true);
    setError('');
    try {
      await lockSecret({ merchantId, appId, secretId, secret: plaintext });
      setLocked(true);
    } catch (err) {
      setError(toMeraErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReveal = async () => {
    setBusy(true);
    setError('');
    try {
      const secret = await revealSecret({ appId, secretId });
      setRevealed(secret);
    } catch (err) {
      setError(toMeraErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (!plaintext && !locked && !error && !revealed) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {plaintext && !locked && (
          <button
            type="button"
            onClick={() => void handleLock()}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
          >
            {busy ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Fingerprint className="h-3 w-3" />}
            Lock to passkey
          </button>
        )}
        {locked && (
          <button
            type="button"
            onClick={() => void handleReveal()}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
          >
            {busy ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Fingerprint className="h-3 w-3" />}
            Reveal with passkey
          </button>
        )}
        {(plaintext && !locked) || locked ? (
          <span className="text-[11px] text-foreground/60">Saved in this browser only</span>
        ) : null}
      </div>
      {revealed && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
          <code className="min-w-0 flex-1 truncate font-mono text-[12px]">{revealed}</code>
          <button type="button" onClick={() => void copy()} className="shrink-0 rounded-md p-1 hover:bg-muted">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </div>
      )}
      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}

export function forgetPasskeySecret(appId: string, secretId: string) {
  dropVault(appId, secretId);
}
