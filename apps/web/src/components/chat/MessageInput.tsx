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
    <div className="px-3 py-2 shrink-0 border-t" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
      {uploading && (
        <p className="text-xs mb-1 text-center" style={{ color: 'var(--info)' }}>uploading...</p>
      )}

      <div className="flex items-end gap-2 relative">
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          className="p-2 shrink-0 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="text-sm">▤</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
        />

        <VoiceRecorder onRecorded={handleVoiceRecorded} onCancel={() => {}} />

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
              className="p-2 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <span className="text-sm">▶</span>
            </button>
          )}
        </div>

        <textarea
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="type a message... (enter to send)"
          rows={1}
          className="flex-1 resize-none terminal-input max-h-32"
          style={{ overflowY: text.split('\n').length > 3 ? 'auto' : 'hidden' }}
        />

        <button
          onClick={handleSendText}
          disabled={!text.trim()}
          className="p-2 shrink-0 transition-colors disabled:opacity-30"
          style={{ color: 'var(--accent)' }}
        >
          <span className="text-sm">▸</span>
        </button>
      </div>
    </div>
  );
}
