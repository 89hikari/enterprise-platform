'use client';

import { clsx } from 'clsx';
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
      className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2 hover:bg-white/30 transition-colors"
    >
      <span className="text-lg">📎</span>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate max-w-48">{name ?? 'File'}</p>
        {sizeMB && <p className="text-xs opacity-70">{sizeMB}</p>}
      </div>
    </a>
  );
}

export function MessageBubble({ message, isOwn }: Props) {
  if (message.isDeleted) {
    return (
      <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <p className="text-xs text-gray-400 italic px-3 py-1">Message deleted</p>
      </div>
    );
  }

  return (
    <div className={clsx('flex mb-1', isOwn ? 'justify-end' : 'justify-start')}>
      {/* Avatar for others */}
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0 mr-2 mt-auto">
          {message.sender?.photoUrl ? (
            <img src={message.sender.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            message.sender ? `${message.sender.firstName[0]}${message.sender.lastName[0]}` : '?'
          )}
        </div>
      )}

      <div className={clsx('max-w-xs lg:max-w-md xl:max-w-lg', isOwn ? 'items-end' : 'items-start', 'flex flex-col')}>
        {/* Sender name for group chats */}
        {!isOwn && message.sender && (
          <p className="text-xs text-gray-500 mb-0.5 ml-1">
            {message.sender.firstName} {message.sender.lastName}
          </p>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div className={clsx(
            'text-xs px-3 py-1.5 rounded-t-lg border-l-2 border-opacity-60 mb-0.5',
            isOwn ? 'bg-blue-400 border-white text-white/90' : 'bg-gray-100 border-gray-400 text-gray-600',
          )}>
            <p className="font-medium">{message.replyTo.sender?.firstName}</p>
            <p className="truncate max-w-48">{message.replyTo.content ?? `[${message.replyTo.messageType}]`}</p>
          </div>
        )}

        {/* Bubble */}
        <div className={clsx(
          'px-3 py-2 rounded-2xl',
          isOwn
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm',
          message.replyTo && 'rounded-t-none',
        )}>
          {message.messageType === 'text' && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {message.messageType === 'image' && message.fileUrl && (
            <img
              src={message.fileUrl}
              alt={message.fileName ?? 'Image'}
              className="max-w-64 rounded-lg cursor-pointer"
              onClick={() => window.open(message.fileUrl!, '_blank')}
            />
          )}

          {message.messageType === 'voice' && message.fileUrl && (
            <div className="flex items-center gap-2 min-w-48">
              <span className="text-lg">🎤</span>
              <audio controls src={message.fileUrl} className="h-8 flex-1" preload="none" />
              {message.durationSeconds && (
                <span className="text-xs opacity-70">{message.durationSeconds}s</span>
              )}
            </div>
          )}

          {message.messageType === 'video' && message.fileUrl && (
            <div>
              <video
                controls
                src={message.fileUrl}
                className="max-w-64 rounded-lg"
                preload="metadata"
              />
            </div>
          )}

          {message.messageType === 'file' && message.fileUrl && (
            <FileAttachment url={message.fileUrl} name={message.fileName} size={message.fileSize} />
          )}

          <p className={clsx(
            'text-right mt-1 text-xs',
            isOwn ? 'text-blue-200' : 'text-gray-400',
          )}>
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
