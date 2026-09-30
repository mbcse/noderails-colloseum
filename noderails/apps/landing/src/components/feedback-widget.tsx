'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, PenLine, Send, X } from 'lucide-react';
import {
  DEVREL_PROMPT_COPY,
  DEVREL_THANKS_EMAIL_COPY,
  isSpeechRecognitionSupported,
  installDevRelAudioUnlock,
  playDevRelPromptAudio,
  playDevRelThanksDoneAudio,
  playDevRelThanksEmailAudio,
  resetDevRelPromptAudioGate,
  silenceDevRelPromptWarmup,
  startSpeechListening,
  stopDevRelAudio,
  stopDevRelClip,
  type SpeechListenHandle,
} from './feedback-speech';

type FeedbackType = 'FEATURE_REQUEST' | 'CHAIN_REQUEST' | 'GENERAL_FEEDBACK';
type WidgetMode = 'idle' | 'prompt' | 'speak' | 'form' | 'success';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
/** Survives refresh in this tab; cleared only when the tab is closed (new tab = fresh). */
const SESSION_SUBMITTED_KEY = 'nr_feedback_submitted';
const SESSION_DISMISSED_KEY = 'nr_feedback_dismissed';
/** Visit clock — shared for the tab; reset only on a hard refresh. */
const SESSION_VISIT_STARTED_KEY = 'nr_feedback_visit_started';
const SESSION_MAX_SCROLL_KEY = 'nr_feedback_max_scroll';
const SESSION_HAS_SCROLLED_KEY = 'nr_feedback_has_scrolled';
const SESSION_FIRST_SCROLL_KEY = 'nr_feedback_first_scroll';
/** Leave helper within the current load (cleared on refresh so refresh does not instant-reopen). */
const SESSION_OPEN_KEY = 'nr_feedback_prompt_open';
/** Once shown this visit clock — remount/refresh must not immediately speak again. */
const SESSION_PROMPT_SHOWN_KEY = 'nr_feedback_prompt_shown';
/** Ignore scroll restoration / address-bar events right after load (mobile). */
const LOAD_MOTION_IGNORE_MS = 800;

const MIN_ELIGIBLE_MS = 8_000;
/** Must be scrolling / have been scrolling this long before the card may open. */
const MIN_SCROLL_ENGAGE_MS = 5_000;
/** Quiet window after the last scroll event before any auto-open is allowed. */
const SCROLL_STOP_MS = 2_500;
const HALF_PAGE_RATIO = 0.4;
const FORM_BLUR_IDLE_MS = 3_000;

function hasSubmittedFeedback(): boolean {
  try {
    return sessionStorage.getItem(SESSION_SUBMITTED_KEY) === '1';
  } catch {
    return false;
  }
}

function hasDismissedFeedback(): boolean {
  try {
    return sessionStorage.getItem(SESSION_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Submit or Cancel in this tab — only a new tab clears these. */
function isBlockedThisTab(): boolean {
  return hasSubmittedFeedback() || hasDismissedFeedback();
}

function markSubmitted(): void {
  try {
    sessionStorage.setItem(SESSION_SUBMITTED_KEY, '1');
    sessionStorage.removeItem(SESSION_OPEN_KEY);
  } catch {
    /* ignore */
  }
}

function markDismissed(): void {
  try {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, '1');
    sessionStorage.removeItem(SESSION_OPEN_KEY);
  } catch {
    /* ignore */
  }
}

function isReloadNavigation(): boolean {
  if (typeof performance === 'undefined') return false;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type === 'reload') return true;
  const legacy = (performance as Performance & { navigation?: { type?: number } }).navigation;
  return legacy?.type === 1;
}

function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

function hasPromptShown(): boolean {
  try {
    return sessionStorage.getItem(SESSION_PROMPT_SHOWN_KEY) === '1';
  } catch {
    return false;
  }
}

function markPromptShown(): void {
  try {
    sessionStorage.setItem(SESSION_PROMPT_SHOWN_KEY, '1');
  } catch {
    /* ignore */
  }
}

function resetVisitClock(): number {
  const now = Date.now();
  try {
    sessionStorage.setItem(SESSION_VISIT_STARTED_KEY, String(now));
    sessionStorage.removeItem(SESSION_MAX_SCROLL_KEY);
    sessionStorage.removeItem(SESSION_HAS_SCROLLED_KEY);
    sessionStorage.removeItem(SESSION_FIRST_SCROLL_KEY);
    sessionStorage.removeItem(SESSION_PROMPT_SHOWN_KEY);
  } catch {
    /* ignore */
  }
  return now;
}

function readVisitStartedAt(): number | null {
  try {
    const raw = sessionStorage.getItem(SESSION_VISIT_STARTED_KEY);
    const existing = raw ? Number(raw) : NaN;
    if (Number.isFinite(existing) && existing > 0) return existing;
  } catch {
    /* ignore */
  }
  return null;
}

/** Call once on mount. Reload wipes the tab clock; other navigations keep it. */
function ensureVisitClockOnMount(): number {
  if (isReloadNavigation()) return resetVisitClock();
  const existing = readVisitStartedAt();
  if (existing != null) return existing;
  return resetVisitClock();
}

function getVisitStartedAt(): number {
  const existing = readVisitStartedAt();
  if (existing != null) return existing;
  return resetVisitClock();
}

function readStoredMaxScroll(): number {
  try {
    const raw = sessionStorage.getItem(SESSION_MAX_SCROLL_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  } catch {
    return 0;
  }
}

function persistMaxScroll(ratio: number): void {
  try {
    sessionStorage.setItem(SESSION_MAX_SCROLL_KEY, String(ratio));
  } catch {
    /* ignore */
  }
}

function readStoredHasScrolled(): boolean {
  try {
    return sessionStorage.getItem(SESSION_HAS_SCROLLED_KEY) === '1';
  } catch {
    return false;
  }
}

function persistHasScrolled(): void {
  try {
    sessionStorage.setItem(SESSION_HAS_SCROLLED_KEY, '1');
  } catch {
    /* ignore */
  }
}

function readFirstScrollAt(): number | null {
  try {
    const raw = sessionStorage.getItem(SESSION_FIRST_SCROLL_KEY);
    const value = raw ? Number(raw) : NaN;
    if (Number.isFinite(value) && value > 0) return value;
  } catch {
    /* ignore */
  }
  return null;
}

function persistFirstScrollAt(at: number): void {
  try {
    sessionStorage.setItem(SESSION_FIRST_SCROLL_KEY, String(at));
  } catch {
    /* ignore */
  }
}

function visitElapsedMs(): number {
  return Math.max(0, Date.now() - getVisitStartedAt());
}

function markPromptOpen(): void {
  try {
    sessionStorage.setItem(SESSION_OPEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

function wasPromptOpen(): boolean {
  try {
    return sessionStorage.getItem(SESSION_OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

function clearPromptOpen(): void {
  try {
    sessionStorage.removeItem(SESSION_OPEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Older builds / keys that caused immediate reopen or sticky locks. */
function clearLegacyAndStaleOpenOnLoad(): void {
  try {
    sessionStorage.removeItem('nr_feedback_prompt_done');
    sessionStorage.removeItem('nr_feedback_engaged_ms');
    // Refresh must not instantly reopen — clear open flag from prior load.
    sessionStorage.removeItem(SESSION_OPEN_KEY);
  } catch {
    /* ignore */
  }
}

function currentScrollRatio(): number {
  if (typeof window === 'undefined') return 0;
  const doc = document.documentElement;
  const scrollHeight = Math.max(doc.scrollHeight, document.body?.scrollHeight ?? 0);
  const travel = Math.max(1, scrollHeight - window.innerHeight);
  return Math.min(1, Math.max(0, window.scrollY / travel));
}

function isOnFeedbackPanel(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[data-nr-feedback-panel]'));
}

function isFormField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function DevRelAvatar({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';
  return (
    <div
      className={`relative shrink-0 rounded-full border border-cyan-300 bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_6px_16px_rgba(37,99,235,0.35)] ${box}`}
    >
      <div className="absolute -left-1 top-1 h-3.5 w-3.5 rounded-full border border-cyan-300 bg-cyan-300" />
      <div className="absolute -right-1 top-1 h-3.5 w-3.5 rounded-full border border-cyan-300 bg-cyan-300" />
      <div className="absolute left-3 top-4 h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
      <div className="absolute right-3 top-4 h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
      <div className="absolute left-1/2 top-6 h-1.5 w-2.5 -translate-x-1/2 rounded-full bg-white" />
    </div>
  );
}

/** Fixed host on <html> — escapes body overflow and stays above page chrome. */
function getFeedbackHost(): HTMLElement {
  const id = 'nr-feedback-host';
  let host = document.getElementById(id);
  if (!host) {
    host = document.createElement('div');
    host.id = id;
    host.setAttribute('data-nr-feedback-host', '1');
    Object.assign(host.style, {
      position: 'fixed',
      inset: '0px',
      width: '100%',
      height: '100vh',
      zIndex: '2147483646',
      pointerEvents: 'none',
      display: 'block',
      overflow: 'visible',
    });
    host.style.height = '100dvh';
    document.documentElement.appendChild(host);
  }
  return host;
}

function FeedbackPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, getFeedbackHost());
}

function isRectInVisualViewport(rect: DOMRect, margin = 8): boolean {
  const vv = window.visualViewport;
  const top = vv ? vv.offsetTop : 0;
  const left = vv ? vv.offsetLeft : 0;
  const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const right = vv ? vv.offsetLeft + vv.width : window.innerWidth;
  return (
    rect.bottom > top + margin &&
    rect.top < bottom - margin &&
    rect.right > left + margin &&
    rect.left < right - margin
  );
}

function visualSafeInsets(): { bottom: number; right: number } {
  if (typeof window === 'undefined') return { bottom: 16, right: 16 };
  const vv = window.visualViewport;
  if (!vv) return { bottom: 16, right: 16 };
  const bottomGap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  const rightGap = Math.max(0, window.innerWidth - vv.width - vv.offsetLeft);
  return { bottom: 16 + bottomGap, right: 16 + rightGap };
}

function panelPositionStyle(wide: boolean, insets: { bottom: number; right: number }): CSSProperties {
  return {
    position: 'fixed',
    right: insets.right,
    bottom: insets.bottom,
    zIndex: 2147483647,
    pointerEvents: 'auto',
    width: wide ? 'min(92vw, 28rem)' : 'min(92vw, 340px)',
    maxHeight: 'min(70dvh, 520px)',
    overflowY: 'auto',
  };
}

const PANEL_SHELL =
  'rounded-2xl border-2 border-cyan-400 bg-white shadow-[0_24px_70px_rgba(6,182,212,0.55)] ring-2 ring-cyan-100';
const PANEL_SHELL_WIDE =
  'rounded-2xl border-2 border-cyan-400 bg-white shadow-[0_30px_80px_rgba(6,182,212,0.55)] ring-2 ring-cyan-100';

export function FeedbackWidget() {
  const [mode, setMode] = useState<WidgetMode>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [helperMessage, setHelperMessage] = useState('');
  const [type, setType] = useState<FeedbackType>('GENERAL_FEEDBACK');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [usedVoice, setUsedVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [safeInsets, setSafeInsets] = useState({ bottom: 16, right: 16 });

  const promptedRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const listenHandleRef = useRef<SpeechListenHandle | null>(null);
  const messageRef = useRef('');
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const lastScrollAtRef = useRef<number>(Date.now());
  const hasScrolledRef = useRef(false);
  const firstScrollAtRef = useRef<number | null>(null);
  const maxScrollRatioRef = useRef(0);
  const isScrollingRef = useRef(false);
  const touchingRef = useRef(false);
  const modeRef = useRef<WidgetMode>('idle');
  const promptPanelRef = useRef<HTMLDivElement | null>(null);
  const formFocusedRef = useRef(false);
  const lastActivityAtRef = useRef(Date.now());

  const canSubmit = useMemo(() => {
    return email.trim().length > 4 && message.trim().length >= 10;
  }, [email, message]);

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => installDevRelAudioUnlock(), []);

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const syncInsets = () => setSafeInsets(visualSafeInsets());
    syncInsets();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncInsets);
    vv?.addEventListener('scroll', syncInsets);
    window.addEventListener('resize', syncInsets);
    return () => {
      vv?.removeEventListener('resize', syncInsets);
      vv?.removeEventListener('scroll', syncInsets);
      window.removeEventListener('resize', syncInsets);
    };
  }, []);

  const stopListening = useCallback(() => {
    listenHandleRef.current?.stop();
    listenHandleRef.current = null;
    setIsListening(false);
  }, []);

  /** Cancel/X: block rest of this tab; only a new tab resets. */
  const dismissForThisView = useCallback(() => {
    stopListening();
    stopDevRelAudio();
    markDismissed();
    promptedRef.current = true;
    setMode('idle');
  }, [stopListening]);

  const isEligible = useCallback(() => {
    if (visitElapsedMs() >= MIN_ELIGIBLE_MS) return true;
    if (maxScrollRatioRef.current >= HALF_PAGE_RATIO) return true;
    return false;
  }, []);

  const canOpenNow = useCallback(
    (opts?: { exit?: boolean }) => {
      if (isBlockedThisTab()) return false;
      if (promptedRef.current || hasPromptShown()) return false;
      if (formFocusedRef.current) return false;
      if (touchingRef.current) return false;
      if (isScrollingRef.current) return false;
      const firstScrollAt = firstScrollAtRef.current;
      if (firstScrollAt == null) return false;
      if (Date.now() - firstScrollAt < MIN_SCROLL_ENGAGE_MS) return false;
      if (
        !opts?.exit &&
        Date.now() - lastScrollAtRef.current < SCROLL_STOP_MS
      ) {
        return false;
      }
      if (!isEligible()) return false;
      return true;
    },
    [isEligible]
  );

  const openPrompt = useCallback(
    (opts?: { force?: boolean }) => {
      if (isBlockedThisTab()) return;
      if (promptedRef.current || hasPromptShown()) return;
      if (touchingRef.current) return;
      if (isScrollingRef.current) return;
      if (opts?.force) {
        if (!canOpenNow({ exit: true })) return;
      } else if (!canOpenNow()) {
        return;
      }
      promptedRef.current = true;
      markPromptShown();
      markPromptOpen();
      setErrorMessage('');
      setHelperMessage('');
      setMode('prompt');
    },
    [canOpenNow]
  );

  // Play once when the card is open and the user is not mid-touch/scroll.
  // Do not bind window touchstart — that is how phones start a scroll.
  useEffect(() => {
    if (mode !== 'prompt') return;
    let cancelled = false;

    const tryPlay = () => {
      if (cancelled || audioUnlockedRef.current) return;
      if (isScrollingRef.current) return;
      if (touchingRef.current) return;
      const panel = promptPanelRef.current;
      if (!panel || !isRectInVisualViewport(panel.getBoundingClientRect())) return;
      void playDevRelPromptAudio(true).then((played) => {
        if (cancelled || isScrollingRef.current) {
          stopDevRelClip('prompt');
          return;
        }
        if (played) audioUnlockedRef.current = true;
      });
    };

    let frame2 = 0;
    const frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(tryPlay);
    });
    const retryId = window.setInterval(() => {
      if (!audioUnlockedRef.current) tryPlay();
    }, 400);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
      window.clearInterval(retryId);
      stopDevRelClip('prompt');
    };
  }, [mode]);

  const ensurePromptAudio = useCallback(async () => {
    const played = await playDevRelPromptAudio(true);
    if (played) audioUnlockedRef.current = true;
  }, []);

  const finishSpeakingToEmail = useCallback(async () => {
    stopListening();
    setIsListening(false);
    setUsedVoice(true);
    setType('GENERAL_FEEDBACK');
    setMode('form');
    setHelperMessage(DEVREL_THANKS_EMAIL_COPY);
    audioUnlockedRef.current = true;
    await playDevRelThanksEmailAudio(true);
    window.setTimeout(() => {
      emailInputRef.current?.focus();
    }, 50);
  }, [stopListening]);

  useEffect(() => {
    clearLegacyAndStaleOpenOnLoad();
    ensureVisitClockOnMount();
    lastActivityAtRef.current = Date.now();
    hasScrolledRef.current = readStoredHasScrolled();
    firstScrollAtRef.current = readFirstScrollAt();
    if (hasScrolledRef.current && firstScrollAtRef.current == null) {
      firstScrollAtRef.current = getVisitStartedAt();
      persistFirstScrollAt(firstScrollAtRef.current);
    }
    maxScrollRatioRef.current = readStoredMaxScroll();
    lastScrollAtRef.current = Date.now();
    promptedRef.current = isBlockedThisTab() || hasPromptShown();
    isScrollingRef.current = false;
    touchingRef.current = false;
    const ignoreMotionUntil = Date.now() + (isCoarsePointer() ? LOAD_MOTION_IGNORE_MS : 0);

    if (promptedRef.current) {
      return;
    }

    let scrollStopTimer: number | null = null;
    let formBlurTimer: number | null = null;

    const clearTimer = (id: number | null) => {
      if (id != null) window.clearTimeout(id);
    };

    const clearScrollStopTimer = () => {
      clearTimer(scrollStopTimer);
      scrollStopTimer = null;
    };

    const recordDepth = () => {
      if (!hasScrolledRef.current) return;
      maxScrollRatioRef.current = Math.max(maxScrollRatioRef.current, currentScrollRatio());
      persistMaxScroll(maxScrollRatioRef.current);
    };

    const tryOpen = () => {
      void openPrompt();
    };

    const tryOpenExit = () => {
      void openPrompt({ force: true });
    };

    const armScrollStop = () => {
      clearScrollStopTimer();
      scrollStopTimer = window.setTimeout(() => {
        isScrollingRef.current = false;
        tryOpen();
      }, SCROLL_STOP_MS);
    };

    const stopPromptVoice = () => {
      if (modeRef.current === 'prompt' || modeRef.current === 'speak') {
        stopDevRelClip('prompt');
        return;
      }
      // Scroll warm-up must not speak before the card exists.
      silenceDevRelPromptWarmup();
    };

    const markBusyFromMotion = (opts?: { userScroll?: boolean }) => {
      if (Date.now() < ignoreMotionUntil) return;
      const now = Date.now();
      lastScrollAtRef.current = now;
      lastActivityAtRef.current = now;
      isScrollingRef.current = true;
      if (opts?.userScroll) {
        hasScrolledRef.current = true;
        persistHasScrolled();
        if (firstScrollAtRef.current == null) {
          firstScrollAtRef.current = now;
          persistFirstScrollAt(now);
        }
        recordDepth();
      }
      stopPromptVoice();
      armScrollStop();
    };

    const onScroll = () => {
      markBusyFromMotion({ userScroll: true });
    };

    const onTouchMove = (event: TouchEvent) => {
      if (isOnFeedbackPanel(event.target)) return;
      markBusyFromMotion({ userScroll: true });
    };

    const onViewportChrome = () => {
      if (!isCoarsePointer()) return;
      lastScrollAtRef.current = Date.now();
      isScrollingRef.current = true;
      armScrollStop();
    };

    const onTouchStart = (event: TouchEvent) => {
      touchingRef.current = true;
      if (isOnFeedbackPanel(event.target)) return;
      lastScrollAtRef.current = Date.now();
      stopPromptVoice();
    };

    const onTouchEnd = (event: TouchEvent) => {
      touchingRef.current = false;
      if (isOnFeedbackPanel(event.target)) {
        if (modeRef.current === 'prompt' && !audioUnlockedRef.current) {
          void playDevRelPromptAudio(true).then((played) => {
            if (played) audioUnlockedRef.current = true;
          });
        }
        return;
      }
      lastScrollAtRef.current = Date.now();
      armScrollStop();
    };

    const tick = () => {
      recordDepth();
      tryOpen();
    };

    const onVisibility = () => {
      if (isCoarsePointer()) return;
      if (document.visibilityState === 'hidden') {
        tryOpenExit();
        return;
      }
      if (wasPromptOpen() && !isBlockedThisTab() && !hasPromptShown()) {
        promptedRef.current = false;
        void openPrompt({ force: true });
        return;
      }
      tryOpen();
    };

    const onMouseOut = (event: MouseEvent) => {
      if (event.relatedTarget != null) return;
      if (event.clientY > 0) return;
      if (isScrollingRef.current || touchingRef.current) return;
      tryOpenExit();
    };

    const onPageHide = () => {
      if (isCoarsePointer()) return;
      if (isBlockedThisTab()) return;
      if (!isEligible()) return;
      markPromptOpen();
      tryOpenExit();
    };

    const onPointerOrKey = () => {
      lastActivityAtRef.current = Date.now();
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isFormField(event.target)) return;
      formFocusedRef.current = true;
      clearTimer(formBlurTimer);
      formBlurTimer = null;
    };

    const onFocusOut = (event: FocusEvent) => {
      if (!isFormField(event.target)) return;
      clearTimer(formBlurTimer);
      formBlurTimer = window.setTimeout(() => {
        formFocusedRef.current = isFormField(document.activeElement);
        if (!formFocusedRef.current) tryOpen();
      }, FORM_BLUR_IDLE_MS);
    };

    const onDocClick = (event: MouseEvent) => {
      lastActivityAtRef.current = Date.now();
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (isEligible()) {
        markPromptOpen();
        tryOpenExit();
      }
    };

    const intervalId = window.setInterval(tick, 500);

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('mouseout', onMouseOut);
    document.addEventListener('pointerdown', onPointerOrKey, { passive: true });
    document.addEventListener('keydown', onPointerOrKey);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('click', onDocClick, true);
    // Capture so nested overflow scrollers still reset the quiet window.
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true, capture: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true });
    window.addEventListener('pagehide', onPageHide);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', onViewportChrome);
    vv?.addEventListener('scroll', onViewportChrome);

    tick();

    return () => {
      window.clearInterval(intervalId);
      clearScrollStopTimer();
      clearTimer(formBlurTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('mouseout', onMouseOut);
      document.removeEventListener('pointerdown', onPointerOrKey);
      document.removeEventListener('keydown', onPointerOrKey);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('click', onDocClick, true);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('touchstart', onTouchStart, true);
      window.removeEventListener('touchmove', onTouchMove, true);
      window.removeEventListener('touchend', onTouchEnd, true);
      window.removeEventListener('touchcancel', onTouchEnd, true);
      window.removeEventListener('pagehide', onPageHide);
      vv?.removeEventListener('resize', onViewportChrome);
      vv?.removeEventListener('scroll', onViewportChrome);
      stopListening();
      // Do not stopDevRelAudio here — prompt-mode effect owns clip lifetime.
    };
  }, [openPrompt, stopListening, isEligible]);

  const startSpeakMode = async () => {
    await ensurePromptAudio();
    stopDevRelAudio();
    setErrorMessage('');
    setHelperMessage('Listening… take your time. We stop ~5 seconds after you finish speaking.');
    setUsedVoice(true);
    setType('GENERAL_FEEDBACK');
    setMode('speak');

    if (!speechSupported) {
      setErrorMessage('Voice input is not supported in this browser. Please write instead.');
      return;
    }

    stopListening();
    setIsListening(true);
    const handle = startSpeechListening({
      onPartial: (text) => setMessage(text.slice(0, 2000)),
      onFinal: (text) => setMessage(text.slice(0, 2000)),
      onError: (msg) => {
        setErrorMessage(msg);
        setIsListening(false);
      },
      onEnd: (reason) => {
        setIsListening(false);
        listenHandleRef.current = null;
        if (reason === 'stopped') return;
        const text = messageRef.current.trim();
        if (text.length >= 3) {
          void finishSpeakingToEmail();
          return;
        }
        if (reason === 'silence') {
          setHelperMessage('No speech detected. Tap Speak again, or switch to Write.');
        }
      },
    });
    listenHandleRef.current = handle;
  };

  const openWriteMode = async () => {
    await ensurePromptAudio();
    stopDevRelAudio();
    stopListening();
    setErrorMessage('');
    setHelperMessage('');
    setMode('form');
  };

  const resetForm = () => {
    setType('GENERAL_FEEDBACK');
    setEmail('');
    setMessage('');
    setErrorMessage('');
    setHelperMessage('');
    setUsedVoice(false);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    stopListening();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          email: email.trim(),
          message: message.trim(),
          source: usedVoice ? 'landing_voice_widget' : 'landing_popup_widget',
          website: '',
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Unable to submit feedback right now');
      }

      setSuccessMessage('Thank you so much!');
      resetForm();
      clearPromptOpen();
      markSubmitted();
      setMode('success');
      void playDevRelThanksDoneAudio(true);
      window.setTimeout(() => {
        setMode('idle');
        promptedRef.current = true;
      }, 2800);
    } catch (error: unknown) {
      const err = error as { message?: string };
      setErrorMessage(err.message ?? 'Something went wrong while sending feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'idle') return null;

  if (mode === 'prompt') {
    return (
      <FeedbackPortal>
        <div
          ref={promptPanelRef}
          data-nr-feedback-panel="1"
          className={PANEL_SHELL}
          style={panelPositionStyle(false, safeInsets)}
          role="dialog"
          aria-modal="true"
          aria-label="NodeRails DevRel feedback"
        >
          <div className="flex items-center justify-between px-4 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">NodeRails DevRel</p>
            <button
              type="button"
              onClick={dismissForThisView}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss feedback popup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 pb-4 pt-2">
            <button
              type="button"
              onClick={() => void ensurePromptAudio()}
              className="flex w-full items-start gap-3 rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 p-3 text-left"
              aria-label="Play DevRel message"
            >
              <DevRelAvatar size="lg" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Quick question</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{DEVREL_PROMPT_COPY}</p>
              </div>
            </button>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => void startSpeakMode()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <Mic className="h-3.5 w-3.5" />
                Speak
              </button>
              <button
                type="button"
                onClick={() => void openWriteMode()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <PenLine className="h-3.5 w-3.5" />
                Write
              </button>
              <button
                type="button"
                onClick={dismissForThisView}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </FeedbackPortal>
    );
  }

  if (mode === 'success') {
    return (
      <FeedbackPortal>
        <div
          data-nr-feedback-panel="1"
          className="rounded-2xl border-2 border-emerald-300 bg-white p-5 shadow-[0_30px_80px_rgba(6,182,212,0.45)]"
          style={panelPositionStyle(true, safeInsets)}
          role="status"
        >
          <p className="text-sm font-semibold text-emerald-800">{successMessage || 'Thank you so much!'}</p>
        </div>
      </FeedbackPortal>
    );
  }

  const showSpeakControls = mode === 'speak';

  return (
    <FeedbackPortal>
      <div
        data-nr-feedback-panel="1"
        className={PANEL_SHELL_WIDE}
        style={panelPositionStyle(true, safeInsets)}
        role="dialog"
        aria-modal="true"
        aria-label="NodeRails feedback form"
      >
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <DevRelAvatar />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {showSpeakControls ? 'Speak your feedback' : 'Share feedback or a request'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {showSpeakControls
                ? 'Take your time to start. We end ~5 seconds after you stop speaking.'
                : helperMessage || 'Feature request, new chain request, or product feedback'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissForThisView}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close feedback panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4 px-5 py-4">
        {showSpeakControls ? (
          <div className="flex flex-wrap gap-2">
            {isListening ? (
              <button
                type="button"
                onClick={() => {
                  const text = messageRef.current.trim();
                  stopListening();
                  if (text.length >= 3) {
                    void finishSpeakingToEmail();
                  } else {
                    setHelperMessage('No speech detected. Tap Speak again, or switch to Write.');
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
              >
                <MicOff className="h-3.5 w-3.5" />
                Done speaking
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startSpeakMode()}
                disabled={!speechSupported}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 disabled:opacity-50"
              >
                <Mic className="h-3.5 w-3.5" />
                {speechSupported ? 'Start listening' : 'Voice unsupported'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void openWriteMode()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <PenLine className="h-3.5 w-3.5" />
              Switch to write
            </button>
            {isListening ? (
              <span className="inline-flex items-center text-[11px] font-medium text-rose-600">Listening…</span>
            ) : null}
          </div>
        ) : null}

        {helperMessage && !showSpeakControls ? (
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-900">{helperMessage}</div>
        ) : null}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Type</label>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={type}
            onChange={(e) => setType(e.target.value as FeedbackType)}
          >
            <option value="FEATURE_REQUEST">Feature Request</option>
            <option value="CHAIN_REQUEST">Chain Request</option>
            <option value="GENERAL_FEEDBACK">General Feedback</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Email</label>
          <input
            ref={emailInputRef}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Request / Feedback</label>
          <textarea
            required
            minLength={10}
            maxLength={2000}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              showSpeakControls
                ? 'Your spoken feedback will appear here…'
                : 'Describe the feature, chain, or feedback in detail...'
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <p className="text-[11px] text-slate-500">{message.length}/2000</p>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{errorMessage}</div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="nr-btn-cloud inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>

        <button
          type="button"
          onClick={() => {
            stopListening();
            stopDevRelAudio();
            resetDevRelPromptAudioGate();
            setHelperMessage('');
            setMode('prompt');
            promptedRef.current = true;
            markPromptOpen();
          }}
          className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back
        </button>
      </form>
      </div>
    </FeedbackPortal>
  );
}
