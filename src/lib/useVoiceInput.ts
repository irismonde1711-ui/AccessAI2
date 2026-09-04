"use client";

import { useEffect, useRef, useState } from "react";

// Minimal shape of the non-standard SpeechRecognition API — not in lib.dom.d.ts.
interface SpeechRecognitionResult {
  0: { transcript: string };
}
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResult & { isFinal: boolean }>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
      .SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
      .webkitSpeechRecognition ??
    null
  );
}

export function useVoiceInput(onTranscript: (text: string) => void) {
  // Starts false on both server and client so the first client render
  // matches SSR output, then flips post-mount once we know the browser
  // actually supports it — SpeechRecognition can't be feature-detected
  // during SSR since `window` doesn't exist there.
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    // Deliberate: flips post-mount so SSR/first-paint stays hydration-safe
    // (see the `useState(false)` comment above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-AU";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          onTranscriptRef.current(result[0].transcript.trim());
        }
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);

  return {
    supported,
    listening,
    start: () => {
      try {
        recognitionRef.current?.start();
        setListening(true);
      } catch {
        // already started
      }
    },
    stop: () => {
      recognitionRef.current?.stop();
      setListening(false);
    },
  };
}
