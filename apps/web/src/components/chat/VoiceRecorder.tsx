'use client';

import { useState, useRef, useCallback } from 'react';

interface Props {
  onRecorded: (blob: Blob, durationSeconds: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onRecorded, onCancel }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.start(100);
    mediaRef.current = recorder;
    startTimeRef.current = Date.now();
    setIsRecording(true);
    timerRef.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
  }, []);

  const stop = useCallback(() => {
    if (!mediaRef.current) return;
    mediaRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mediaRef.current!.mimeType });
      const dur = Math.round((Date.now() - startTimeRef.current) / 1000);
      onRecorded(blob, dur);
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
    mediaRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  }, [onRecorded]);

  const cancel = useCallback(() => {
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    onCancel();
  }, [onCancel]);

  if (!isRecording) {
    return (
      <button
        onClick={start}
        title="Record voice message"
        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
      >
        🎤
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-red-50 rounded-xl">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-sm text-red-600 font-mono w-10">{seconds}s</span>
      <button onClick={cancel} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
      <button
        onClick={stop}
        className="text-xs bg-red-500 text-white px-3 py-1 rounded-full hover:bg-red-600"
      >
        Send
      </button>
    </div>
  );
}
