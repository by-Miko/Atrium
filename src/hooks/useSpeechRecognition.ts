import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../types/chat';

interface ElectronSpeechResult {
  text: string;
  isFinal: boolean;
}

interface ElectronSpeechError {
  code: string;
  detail?: string;
}

interface ElectronStartResponse {
  ok: boolean;
  fallbackToWebSpeech?: boolean;
  errorCode?: string;
  detail?: string;
}

export interface ElectronSecretEncryptResponse {
  ok: boolean;
  encrypted?: string;
  fallbackSessionOnly?: boolean;
}

export interface ElectronSecretDecryptResponse {
  ok: boolean;
  plaintext?: string;
}

interface ElectronSpeechAPI {
  isElectron?: boolean;
  platform?: string;
  startNativeDictation?: (language: Language) => Promise<ElectronStartResponse>;
  stopNativeDictation?: () => Promise<{ ok: boolean }>;
  onDictationResult?: (cb: (payload: ElectronSpeechResult) => void) => () => void;
  onDictationError?: (cb: (payload: ElectronSpeechError) => void) => () => void;
  onDictationEnd?: (cb: () => void) => () => void;
  encryptSecret?: (plaintext: string) => Promise<ElectronSecretEncryptResponse>;
  decryptSecret?: (
    encryptedPayload: string
  ) => Promise<ElectronSecretDecryptResponse>;
}

declare global {
  interface Window {
    electronAPI?: ElectronSpeechAPI;
  }
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getNativeElectronSpeechAPI(): ElectronSpeechAPI | null {
  if (typeof window === 'undefined') return null;
  const api = window.electronAPI;
  if (
    api &&
    api.platform === 'win32' &&
    typeof api.startNativeDictation === 'function' &&
    typeof api.stopNativeDictation === 'function'
  ) {
    return api;
  }
  return null;
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function isNativeElectronSpeechSupported(): boolean {
  return getNativeElectronSpeechAPI() !== null;
}

export function isSpeechRecognitionSupported(): boolean {
  return (
    getNativeElectronSpeechAPI() !== null ||
    getSpeechRecognitionConstructor() !== null
  );
}

interface UseSpeechRecognitionOptions {
  language: Language;
  onTranscript: (text: string) => void;
  onError?: (errorCode: string, detailMessage?: string) => void;
}

export function useSpeechRecognition({
  language,
  onTranscript,
  onError,
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const nativeCleanupRef = useRef<Array<() => void>>([]);
  const committedPhrasesRef = useRef<string[]>([]);
  const manualStopRef = useRef(false);
  const nativeTriggerPendingRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;

  const isSupported = isSpeechRecognitionSupported();

  const cleanupNativeListeners = useCallback(() => {
    while (nativeCleanupRef.current.length > 0) {
      const unsub = nativeCleanupRef.current.pop();
      try {
        unsub?.();
      } catch {
        // ignore
      }
    }
  }, []);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    const nativeApi = getNativeElectronSpeechAPI();
    if (nativeApi?.stopNativeDictation) {
      void nativeApi.stopNativeDictation();
      cleanupNativeListeners();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore if already stopped
      }
    }
    setIsListening(false);
  }, [cleanupNativeListeners]);

  const startWebSpeech = useCallback(() => {
    const SpeechRec = getSpeechRecognitionConstructor();
    if (!SpeechRec) {
      onErrorRef.current?.('unsupported');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    manualStopRef.current = false;

    const recognition = new SpeechRec();
    recognition.lang = language === 'es' ? 'es-ES' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    let lastEmitted = '';

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const parts: string[] = [];
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const segment = result?.[0]?.transcript?.trim();
        if (segment) {
          parts.push(segment);
        }
      }
      const cleaned = parts.join(' ').trim();
      if (cleaned && cleaned !== lastEmitted) {
        lastEmitted = cleaned;
        onTranscriptRef.current(cleaned);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      setIsListening(false);
      if (manualStopRef.current && event.error === 'aborted') {
        return;
      }
      onErrorRef.current?.(event.error || 'unknown', event.message);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      setIsListening(false);
      recognitionRef.current = null;
      const errMsg = err instanceof Error ? err.message : undefined;
      onErrorRef.current?.('start-failed', errMsg);
    }
  }, [language]);

  const start = useCallback(() => {
    const nativeApi = getNativeElectronSpeechAPI();
    if (nativeApi?.startNativeDictation) {
      if (nativeTriggerPendingRef.current) return;
      cleanupNativeListeners();
      manualStopRef.current = false;
      committedPhrasesRef.current = [];
      nativeTriggerPendingRef.current = true;
      setIsListening(false);

      if (nativeApi.onDictationError) {
        nativeCleanupRef.current.push(
          nativeApi.onDictationError(({ code, detail }) => {
            nativeTriggerPendingRef.current = false;
            setIsListening(false);
            cleanupNativeListeners();
            if (manualStopRef.current && code === 'aborted') return;
            onErrorRef.current?.(code || 'start-failed', detail);
          })
        );
      }

      if (nativeApi.onDictationEnd) {
        nativeCleanupRef.current.push(
          nativeApi.onDictationEnd(() => {
            nativeTriggerPendingRef.current = false;
            setIsListening(false);
            cleanupNativeListeners();
          })
        );
      }

      void nativeApi
        .startNativeDictation(language)
        .then((res) => {
          if (manualStopRef.current) return;
          if (!res?.ok) {
            cleanupNativeListeners();
            if (res?.fallbackToWebSpeech) {
              startWebSpeech();
              return;
            }
            if (res?.errorCode !== 'aborted') {
              onErrorRef.current?.(
                res?.errorCode || 'start-failed',
                res?.detail
              );
            }
          }
        })
        .catch(() => {
          onErrorRef.current?.('start-failed');
        })
        .finally(() => {
          nativeTriggerPendingRef.current = false;
          setIsListening(false);
        });
      return;
    }

    startWebSpeech();
  }, [cleanupNativeListeners, language, startWebSpeech]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  useEffect(() => {
    return () => {
      manualStopRef.current = true;
      const nativeApi = getNativeElectronSpeechAPI();
      if (nativeApi?.stopNativeDictation) {
        void nativeApi.stopNativeDictation();
      }
      cleanupNativeListeners();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, [cleanupNativeListeners]);

  return {
    isSupported,
    isListening,
    start,
    stop,
    toggle,
  };
}
