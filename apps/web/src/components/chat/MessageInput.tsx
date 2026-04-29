'use client';

import { useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { VoiceRecorder } from './VoiceRecorder';
import { VideoRecorder } from './VideoRecorder';

interface SendPayload {
  messageType: 'text' | 'voice' | 'video' | 'file' | 'image';
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  durationSeconds?: number;
}

interface Props {
  roomId: string;
  token: string | undefined;
  onSend: (payload: SendPayload) => void;
  onTyping: (isTyping: boolean) => void;
}

export function MessageInput({ roomId, token, onSend, onTyping }: Props) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 2000);
  };

  const handleSendText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend({ messageType: 'text', content: trimmed });
    setText('');
    onTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const uploadAndSend = useCallback(
    async (file: File, messageType: 'file' | 'image' | 'voice' | 'video', durationSeconds?: number) => {
      setUploading(true);
      try {
        const bucket =
          messageType === 'image' ? 'avatars'
          : messageType === 'voice' || messageType === 'video' ? 'chat'
          : 'chat';

        const { uploadUrl, key } = await api.post<{ uploadUrl: string; key: string }>(
          '/files/presign/upload',
          { bucket, fileName: file.name, contentType: file.type },
          token,
        );

        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

        const { downloadUrl } = await api.get<{ downloadUrl: string }>(
          `/files/presign/download/${bucket}/${encodeURIComponent(key)}`,
          token,
        );

        onSend({
          messageType,
          fileUrl: downloadUrl,
          fileName: file.name,
          fileSize: file.size,
          durationSeconds,
        });
      } finally {
        setUploading(false);
      }
    },
    [token, onSend],
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    await uploadAndSend(file, isImage ? 'image' : 'file');
    e.target.value = '';
  };

  const handleVoiceRecorded = async (blob: Blob, durationSeconds: number) => {
    const file = new File([blob], 'voice-message.webm', { type: blob.type });
    await uploadAndSend(file, 'voice', durationSeconds);
  };

  const handleVideoRecorded = async (blob: Blob, durationSeconds: number) => {
    const file = new File([blob], 'video-message.webm', { type: 'video/webm' });
    await uploadAndSend(file, 'video', durationSeconds);
    setShowVideo(false);
  };

  return (
    <div className="border-t border-gray-200 bg-white px-3 py-2 shrink-0">
      {uploading && (
        <p className="text-xs text-blue-500 mb-1 text-center">Uploading...</p>
      )}

      <div className="flex items-end gap-2 relative">
        {/* File attach */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          className="p-2 text-gray-400 hover:text-blue-600 transition-colors shrink-0"
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
        />

        {/* Voice */}
        <VoiceRecorder onRecorded={handleVoiceRecorded} onCancel={() => {}} />

        {/* Video */}
        <div className="relative">
          {showVideo ? (
            <VideoRecorder
              onRecorded={handleVideoRecorded}
              onCancel={() => setShowVideo(false)}
            />
          ) : (
            <button
              onClick={() => setShowVideo(true)}
              title="Record video message"
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
            >
              🎥
            </button>
          )}
        </div>

        {/* Text area */}
        <textarea
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 max-h-32"
          style={{ overflowY: text.split('\n').length > 3 ? 'auto' : 'hidden' }}
        />

        {/* Send */}
        <button
          onClick={handleSendText}
          disabled={!text.trim()}
          className="p-2 text-blue-600 disabled:text-gray-300 hover:text-blue-800 transition-colors shrink-0"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
