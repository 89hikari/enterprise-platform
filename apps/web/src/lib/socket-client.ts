'use client';

import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || '';

let chatSocket: Socket | null = null;
let kanbanSocket: Socket | null = null;
let notifSocket: Socket | null = null;
let chessSocket: Socket | null = null;

export function getChatSocket(token: string): Socket {
  if (!chatSocket || !chatSocket.connected) {
    chatSocket = io(`${WS_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return chatSocket;
}

export function getKanbanSocket(token: string): Socket {
  if (!kanbanSocket || !kanbanSocket.connected) {
    kanbanSocket = io(`${WS_URL}/kanban`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return kanbanSocket;
}

export function getNotifSocket(token: string): Socket {
  if (!notifSocket || !notifSocket.connected) {
    notifSocket = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return notifSocket;
}

export function getChessSocket(token: string): Socket {
  if (!chessSocket || !chessSocket.connected) {
    chessSocket = io(`${WS_URL}/chess`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return chessSocket;
}

export function disconnectAll() {
  chatSocket?.disconnect();
  kanbanSocket?.disconnect();
  notifSocket?.disconnect();
  chessSocket?.disconnect();
  chatSocket = null;
  kanbanSocket = null;
  notifSocket = null;
  chessSocket = null;
}
