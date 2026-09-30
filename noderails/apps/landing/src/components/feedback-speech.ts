const PROMPT_AUDIO_SRC = '/audio/devrel-feedback-prompt.mp3';
const THANKS_EMAIL_AUDIO_SRC = '/audio/devrel-feedback-thanks-email.mp3';
const THANKS_DONE_AUDIO_SRC = '/audio/devrel-feedback-thanks-done.mp3';

/** Stop listening after this much quiet once the user has spoken (transcript non-empty). */
export const SPEECH_SILENCE_AFTER_MS = 5_000;
/** How long to keep waiting for the user to start speaking before giving up. */
export const SPEECH_START_GRACE_MS = 45_000;

export const DEVREL_PROMPT_COPY =
  'Hey - did you like NodeRails? We would love your feedback. You can fill the form, or speak up here.';

export const DEVREL_THANKS_EMAIL_COPY =
  'Thank you so much for your feedback. Just enter your email and submit.';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

type ClipId = 'prompt' | 'thanksEmail' | 'thanksDone';

const clipSrc: Record<ClipId, string> = {
  prompt: PROMPT_AUDIO_SRC,
  thanksEmail: THANKS_EMAIL_AUDIO_SRC,
  thanksDone: THANKS_DONE_AUDIO_SRC,
};

const clipAudio: Partial<Record<ClipId, HTMLAudioElement>> = {};
const clipPlayed: Partial<Record<ClipId, boolean>> = {};
const clipGeneration: Record<ClipId, number> = {
  prompt: 0,
  thanksEmail: 0,
  thanksDone: 0,
};

function getClip(id: ClipId): HTMLAudioElement {
  if (!clipAudio[id]) {
    const audio = new Audio(clipSrc[id]);
    audio.preload = 'auto';
    clipAudio[id] = audio;
  }
  return clipAudio[id]!;
}

export function stopDevRelClip(id: ClipId): void {
  clipGeneration[id] += 1;
  if (id === 'prompt') promptAudible = false;
  const audio = clipAudio[id];
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

export function stopDevRelAudio(): void {
  for (const id of Object.keys(clipAudio) as ClipId[]) {
    stopDevRelClip(id);
  }
}

/** True while the open card intends the prompt to be audible. Unlock must not speak it. */
let promptAudible = false;

function promptIsAudiblyPlaying(audio: HTMLAudioElement): boolean {
  return !audio.paused && !audio.muted && audio.volume > 0 && audio.currentTime > 0.05;
}

/** Pause a gesture warm-up. Never unmutes — mobile browsers resume the whole clip if we do. */
export function silenceDevRelPromptWarmup(): void {
  if (promptAudible) return;
  const audio = clipAudio.prompt;
  if (!audio) return;
  audio.pause();
  audio.muted = true;
  audio.volume = 0;
  try {
    audio.currentTime = 0;
  } catch {
    /* not seekable yet */
  }
}

function ensurePromptSilenceGuard(audio: HTMLAudioElement): void {
  if (audio.dataset.nrSilenceGuard === '1') return;
  audio.dataset.nrSilenceGuard = '1';
  const silence = () => {
    if (promptAudible) return;
    silenceDevRelPromptWarmup();
  };
  audio.addEventListener('playing', silence);
  audio.addEventListener('timeupdate', silence);
}

/**
 * Chrome/Safari block unmuted autoplay until a real user gesture.
 * Prime the prompt element at volume 0. A scroll finger-up must stay silent;
 * the card is what speaks. Never unmute here — iOS resumes the clip if we do.
 */
export function installDevRelAudioUnlock(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let detached = false;

  const unlock = () => {
    const audio = getClip('prompt');
    ensurePromptSilenceGuard(audio);
    if (promptAudible && promptIsAudiblyPlaying(audio)) {
      detach();
      return;
    }
    audio.muted = true;
    audio.volume = 0;
    const playResult = audio.play();
    const finish = () => {
      if (promptAudible) return;
      silenceDevRelPromptWarmup();
    };
    if (playResult && typeof playResult.then === 'function') {
      void playResult.then(finish).catch(finish);
    } else {
      finish();
    }
    detach();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    unlock();
  };

  const opts: AddEventListenerOptions = { capture: true, passive: true };
  const detach = () => {
    if (detached) return;
    detached = true;
    window.removeEventListener('pointerdown', onPointerDown, opts);
    window.removeEventListener('keydown', unlock, opts);
    window.removeEventListener('touchend', unlock, opts);
    window.removeEventListener('wheel', unlock, opts);
  };

  window.addEventListener('pointerdown', onPointerDown, opts);
  window.addEventListener('keydown', unlock, opts);
  window.addEventListener('touchend', unlock, opts);
  window.addEventListener('wheel', unlock, opts);
  return detach;
}

/** @deprecated use stopDevRelAudio */
export function stopDevRelPromptAudio(): void {
  stopDevRelAudio();
}

export async function playDevRelClip(id: ClipId, force = false): Promise<boolean> {
  const existing = clipAudio[id];
  if (existing && promptIsAudiblyPlaying(existing)) return true;
  if (clipPlayed[id] && !force) return true;
  if (id !== 'prompt') {
    stopDevRelAudio();
  } else {
    stopDevRelClip('thanksEmail');
    stopDevRelClip('thanksDone');
  }
  const generation = clipGeneration[id] + 1;
  clipGeneration[id] = generation;
  try {
    const audio = getClip(id);
    if (id === 'prompt') {
      ensurePromptSilenceGuard(audio);
      promptAudible = true;
    }
    audio.muted = false;
    audio.volume = 1;
    audio.currentTime = 0;
    await audio.play();
    if (clipGeneration[id] !== generation) {
      audio.pause();
      audio.currentTime = 0;
      return false;
    }
    clipPlayed[id] = true;
    return true;
  } catch {
    if (id === 'prompt' && clipGeneration[id] === generation) promptAudible = false;
    return false;
  }
}

export async function playDevRelPromptAudio(force = false): Promise<boolean> {
  return playDevRelClip('prompt', force);
}

export async function playDevRelThanksEmailAudio(force = true): Promise<boolean> {
  return playDevRelClip('thanksEmail', force);
}

export async function playDevRelThanksDoneAudio(force = true): Promise<boolean> {
  return playDevRelClip('thanksDone', force);
}

export function resetDevRelPromptAudioGate(): void {
  clipPlayed.prompt = false;
  stopDevRelAudio();
}

export type SpeechListenHandle = {
  stop: () => void;
};

export function startSpeechListening(options: {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: (reason: 'silence' | 'stopped' | 'error' | 'ended') => void;
  /** Quiet time after speech before we treat the turn as done. Default 5s. */
  silenceAfterMs?: number;
  /** Max wait for the user to begin speaking. Default 45s. */
  startGraceMs?: number;
}): SpeechListenHandle | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    options.onError('Voice input is not supported in this browser. Please write instead.');
    return null;
  }

  const silenceAfterMs = options.silenceAfterMs ?? SPEECH_SILENCE_AFTER_MS;
  const startGraceMs = options.startGraceMs ?? SPEECH_START_GRACE_MS;

  const recognition = new Ctor();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalized = '';
  let latestText = '';
  let finished = false;
  let silenceTimer: number | null = null;
  let startGraceTimer: number | null = null;
  const startedAt = Date.now();

  const hasSpoken = () => latestText.trim().length > 0;

  const clearSilenceTimer = () => {
    if (silenceTimer != null) {
      window.clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  const clearStartGraceTimer = () => {
    if (startGraceTimer != null) {
      window.clearTimeout(startGraceTimer);
      startGraceTimer = null;
    }
  };

  const finish = (reason: 'silence' | 'stopped' | 'error' | 'ended') => {
    if (finished) return;
    finished = true;
    clearSilenceTimer();
    clearStartGraceTimer();
    try {
      recognition.stop();
    } catch {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    }
    options.onEnd(reason);
  };

  /** Only arm end-of-turn silence once we have transcript text. */
  const armPostSpeechSilence = () => {
    clearSilenceTimer();
    if (!hasSpoken()) return;
    silenceTimer = window.setTimeout(() => {
      if (!hasSpoken()) return;
      finish('silence');
    }, silenceAfterMs);
  };

  const restartIfNeeded = () => {
    if (finished) return;
    // Still waiting for first words — keep the mic open.
    if (!hasSpoken()) {
      if (Date.now() - startedAt >= startGraceMs) {
        finish('silence');
        return;
      }
      try {
        recognition.start();
      } catch {
        window.setTimeout(() => {
          if (finished || hasSpoken()) return;
          try {
            recognition.start();
          } catch {
            /* ignore brief restart races */
          }
        }, 200);
      }
      return;
    }
    // Already have speech; Chrome ended the session — restart and keep the pause timer.
    try {
      recognition.start();
      armPostSpeechSilence();
    } catch {
      finish('ended');
    }
  };

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const piece = result[0]?.transcript ?? '';
      if (!piece.trim()) continue;
      if (result.isFinal) {
        finalized = `${finalized} ${piece}`.trim();
        options.onFinal(finalized);
      } else {
        interim += piece;
      }
    }
    const combined = `${finalized} ${interim}`.trim();
    if (combined) {
      latestText = combined;
      clearStartGraceTimer();
      options.onPartial(combined);
      armPostSpeechSilence();
    }
  };

  recognition.onerror = (event) => {
    if (event.error === 'aborted') {
      finish('stopped');
      return;
    }
    // "no-speech" / "audio-capture" blips while waiting to start — keep listening.
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
      if (!hasSpoken()) {
        restartIfNeeded();
        return;
      }
      // Had speech already; treat as pause end only after silence timer (don't finish here).
      return;
    }
    options.onError(
      event.error === 'not-allowed'
        ? 'Microphone permission was denied. You can write feedback instead.'
        : `Voice input error: ${event.error}`
    );
    finish('error');
  };

  recognition.onend = () => {
    if (finished) return;
    restartIfNeeded();
  };

  try {
    recognition.start();
    // Give the user time to start; only give up after startGraceMs with empty transcript.
    startGraceTimer = window.setTimeout(() => {
      if (!hasSpoken()) finish('silence');
    }, startGraceMs);
  } catch {
    options.onError('Could not start voice input. Please write instead.');
    return null;
  }

  return {
    stop: () => {
      finish('stopped');
    },
  };
}
