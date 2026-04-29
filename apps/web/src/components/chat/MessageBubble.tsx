'use client';

import type { ChatMessage } from '@enterprise/shared';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function FileAttachment({ url, name, size }: { url: string; name: string | null; size: number | null }) {
  const sizeMB = size ? (size / 1024 / 1024).toFixed(1) + ' MB' : '';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded px-3 py-2 transition-colors"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <span className="text-sm">▤</span>
      <div className="min-w-0">
        <p className="text-xs font-medium truncate max-w-48">{name ?? 'file'}</p>
        {sizeMB && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sizeMB}</p>}
      </div>
    </a>
  );
}

export function MessageBubble({ message, isOwn }: Props) {
  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <p className="text-xs italic px-3 py-1" style={{ color: 'var(--text-muted)' }}>message deleted</p>
      </div>
    );
  }

  return (
    <div className={`flex mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 mr-2 mt-auto"
          style={{ background: 'var(--bg-active)', color: 'var(--text-secondary)' }}
        >
          {message.sender?.photoUrl ? (
            <img src={message.sender.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            message.sender ? `${message.sender.firstName[0]}${message.sender.lastName[0]}` : '?'
          )}
        </div>
      )}

      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isOwn && message.sender && (
          <p className="text-xs mb-0.5 ml-1" style={{ color: 'var(--text-muted)' }}>
            {message.sender.firstName} {message.sender.lastName[0]}.
          </p>
        )}

        {message.replyTo && (
          <div
            className="text-xs px-3 py-1.5 rounded-t border-l-2 mb-0.5"
            style={{
              background: isOwn ? 'var(--accent-soft)' : 'var(--bg-surface)',
              borderLeftColor: 'var(--accent)',
              color: 'var(--text-secondary)',
            }}
          >
            <p className="font-medium">{message.replyTo.sender?.firstName}</p>
            <p className="truncate max-w-48">{message.replyTo.content ?? `[${message.replyTo.messageType}]`}</p>
          </div>
        )}

        <div
          className="px-3 py-2 rounded"
          style={{
            background: isOwn ? 'var(--accent)' : 'var(--bg-elevated)',
            border: isOwn ? 'none' : '1px solid var(--border)',
            color: isOwn ? 'var(--accent-fg)' : 'var(--text)',
            borderBottomRightRadius: isOwn ? '0' : 'var(--radius)',
            borderBottomLeftRadius: isOwn ? 'var(--radius)' : '0',
          }}
        >
          {message.messageType === 'text' && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {message.messageType === 'image' && message.fileUrl && (
            <img
              src={message.fileUrl}
              alt={message.fileName ?? 'Image'}
              className="max-w-64 rounded cursor-pointer"
              onClick={() => window.open(message.fileUrl!, '_blank')}
            />
          )}

          {message.messageType === 'voice' && message.fileUrl && (
            <div className="flex items-center gap-2 min-w-48">
              <span className="text-sm">♫</span>
              <audio controls src={message.fileUrl} className="h-8 flex-1" preload="none" />
              {message.durationSeconds && (
                <span className="text-xs" style={{ opacity: 0.7 }}>{message.durationSeconds}s</span>
              )}
            </div>
          )}

          {message.messageType === 'video' && message.fileUrl && (
            <div>
              <video
                controls
                src={message.fileUrl}
                className="max-w-64 rounded"
                preload="metadata"
              />
            </div>
          )}

          {message.messageType === 'file' && message.fileUrl && (
            <FileAttachment url={message.fileUrl} name={message.fileName} size={message.fileSize} />
          )}

          <p className="text-right mt-1 text-xs" style={{ opacity: 0.6 }}>
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
