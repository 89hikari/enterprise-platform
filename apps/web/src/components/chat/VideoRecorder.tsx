'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  onRecorded: (blob: Blob, durationSeconds: number) => void;
  onCancel: () => void;
}

export function VideoRecorder({ onRecorded, onCancel }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [preview, setPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const startPreview = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
    }
    setPreview(true);
  }, []);

  const start = useCallback(() => {
    if (!streamRef.current) return;
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
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
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const dur = Math.round((Date.now() - startTimeRef.current) / 1000);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onRecorded(blob, dur);
    };
    mediaRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  }, [onRecorded]);

  const cancel = useCallback(() => {
    mediaRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setPreview(false);
    onCancel();
  }, [onCancel]);

  if (!preview) {
    return (
      <button
        onClick={startPreview}
        title="Record video message"
        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
      >
        🎥
      </button>
    );
  }

  return (
    <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-72">
      <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg bg-black mb-2 aspect-video" />
      <div className="flex items-center justify-between">
        <button onClick={cancel} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
        {isRecording ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-mono text-red-600">{seconds}s</span>
            <button
              onClick={stop}
              className="text-sm bg-red-500 text-white px-3 py-1 rounded-full hover:bg-red-600"
            >
              Stop
            </button>
          </div>
        ) : (
          <button
            onClick={start}
            className="text-sm bg-blue-600 text-white px-4 py-1 rounded-full hover:bg-blue-700"
          >
            ● Record
          </button>
        )}
      </div>
    </div>
  );
}
