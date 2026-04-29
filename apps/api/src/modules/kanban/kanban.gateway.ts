import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { KanbanService } from './kanban.service';

@WebSocketGateway({ namespace: '/kanban', cors: { origin: '*' } })
export class KanbanGateway {
  @WebSocketServer() server!: Server;

  constructor(private kanban: KanbanService) {}

  @SubscribeMessage('join_board')
  handleJoinBoard(@ConnectedSocket() client: Socket, @MessageBody() payload: { boardId: string }) {
    client.join(`board:${payload.boardId}`);
    return { event: 'joined', boardId: payload.boardId };
  }

  @SubscribeMessage('leave_board')
  handleLeaveBoard(@ConnectedSocket() client: Socket, @MessageBody() payload: { boardId: string }) {
    client.leave(`board:${payload.boardId}`);
  }

  emitCardMoved(boardId: string, data: { cardId: string; fromColumnId: string; toColumnId: string; newPosition: number }) {
    this.server.to(`board:${boardId}`).emit('card_moved', data);
  }

  emitCardUpdated(boardId: string, card: unknown) {
    this.server.to(`board:${boardId}`).emit('card_updated', card);
  }

  emitColumnUpdated(boardId: string, column: unknown) {
    this.server.to(`board:${boardId}`).emit('column_updated', column);
  }

  emitCardCreated(boardId: string, card: unknown) {
    this.server.to(`board:${boardId}`).emit('card_created', card);
  }

  emitCardDeleted(boardId: string, cardId: string) {
    this.server.to(`board:${boardId}`).emit('card_deleted', { cardId });
  }
}
