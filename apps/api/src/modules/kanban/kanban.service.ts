import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const CARD_SELECT = {
  id: true, columnId: true, boardId: true, title: true,
  description: true, position: true, dueDate: true,
  createdBy: true, createdAt: true, updatedAt: true,
  assignees: { select: { user: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } } },
  labels: { select: { label: { select: { id: true, name: true, color: true } } } },
  subtasks: { orderBy: { position: 'asc' as const }, select: { id: true, title: true, isCompleted: true, position: true } },
  attachments: { orderBy: { createdAt: 'asc' as const }, select: { id: true, fileUrl: true, fileName: true, fileSize: true, uploadedBy: true, createdAt: true } },
} as const;

@Injectable()
export class KanbanService {
  constructor(private prisma: PrismaService) {}

  // ── Boards ─────────────────────────────────────────────────────────────────

  async getBoards(userId: string, organizationId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } });
    const orgId = organizationId ?? user?.organizationId;
    return this.prisma.kanbanBoard.findMany({
      where: {
        organizationId: orgId,
        isArchived: false,
        OR: [
          { createdBy: userId },
          { members: { some: { userId } } },
        ],
      },
      include: { _count: { select: { cards: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getBoard(boardId: string, userId: string) {
    const board = await this.prisma.kanbanBoard.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              where: {},
              orderBy: { position: 'asc' },
              select: CARD_SELECT,
            },
          },
        },
        members: { select: { userId: true, role: true, user: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } } },
        labels: true,
      },
    });
    if (!board) throw new NotFoundException('Board not found');
    this.assertMember(board, userId);
    return board;
  }

  async createBoard(data: { name: string; description?: string; organizationId?: string }, createdBy: string) {
    let { organizationId } = data;
    if (!organizationId) {
      const user = await this.prisma.user.findUnique({ where: { id: createdBy }, select: { organizationId: true } });
      if (!user) throw new NotFoundException('User not found');
      organizationId = user.organizationId;
    }
    const board = await this.prisma.kanbanBoard.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId,
        createdBy,
        members: { create: { userId: createdBy, role: 'owner' } },
        columns: {
          create: [
            { name: 'To Do', position: 1, color: '#94a3b8' },
            { name: 'In Progress', position: 2, color: '#3b82f6' },
            { name: 'Done', position: 3, color: '#22c55e' },
          ],
        },
      },
      include: { columns: { orderBy: { position: 'asc' } }, members: true },
    });
    return board;
  }

  async updateBoard(boardId: string, userId: string, data: { name?: string; description?: string }) {
    await this.assertEditor(boardId, userId);
    return this.prisma.kanbanBoard.update({ where: { id: boardId }, data });
  }

  async archiveBoard(boardId: string, userId: string) {
    await this.assertOwner(boardId, userId);
    return this.prisma.kanbanBoard.update({ where: { id: boardId }, data: { isArchived: true } });
  }

  async addBoardMember(boardId: string, targetUserId: string, role: string, requesterId: string) {
    await this.assertOwner(boardId, requesterId);
    return this.prisma.kanbanBoardMember.upsert({
      where: { boardId_userId: { boardId, userId: targetUserId } },
      create: { boardId, userId: targetUserId, role: role as any },
      update: { role: role as any },
    });
  }

  // ── Columns ────────────────────────────────────────────────────────────────

  async createColumn(boardId: string, userId: string, data: { name: string; color?: string }) {
    await this.assertEditor(boardId, userId);
    const maxPos = await this.prisma.kanbanColumn.aggregate({ where: { boardId }, _max: { position: true } });
    return this.prisma.kanbanColumn.create({
      data: { boardId, name: data.name, color: data.color, position: (maxPos._max.position ?? 0) + 1 },
    });
  }

  async updateColumn(columnId: string, userId: string, data: { name?: string; color?: string; position?: number }) {
    const col = await this.prisma.kanbanColumn.findUnique({ where: { id: columnId } });
    if (!col) throw new NotFoundException('Column not found');
    await this.assertEditor(col.boardId, userId);
    return this.prisma.kanbanColumn.update({ where: { id: columnId }, data });
  }

  async deleteColumn(columnId: string, userId: string) {
    const col = await this.prisma.kanbanColumn.findUnique({ where: { id: columnId } });
    if (!col) throw new NotFoundException('Column not found');
    await this.assertEditor(col.boardId, userId);
    return this.prisma.kanbanColumn.delete({ where: { id: columnId } });
  }

  // ── Cards ──────────────────────────────────────────────────────────────────

  async createCard(
    columnId: string,
    userId: string,
    data: { title: string; description?: string; dueDate?: string; assigneeIds?: string[]; labelIds?: string[] },
  ) {
    const col = await this.prisma.kanbanColumn.findUnique({ where: { id: columnId } });
    if (!col) throw new NotFoundException('Column not found');
    await this.assertEditor(col.boardId, userId);

    const maxPos = await this.prisma.kanbanCard.aggregate({ where: { columnId }, _max: { position: true } });
    const position = (maxPos._max.position ?? 0) + 1000;

    return this.prisma.kanbanCard.create({
      data: {
        columnId,
        boardId: col.boardId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        position,
        createdBy: userId,
        assignees: data.assigneeIds ? { create: data.assigneeIds.map((uid) => ({ userId: uid })) } : undefined,
        labels: data.labelIds ? { create: data.labelIds.map((lid) => ({ labelId: lid })) } : undefined,
      },
      select: CARD_SELECT,
    });
  }

  async getCard(cardId: string, userId: string) {
    const card = await this.prisma.kanbanCard.findUnique({ where: { id: cardId }, select: CARD_SELECT });
    if (!card) throw new NotFoundException('Card not found');
    await this.assertMemberByBoard(card.boardId, userId);
    return card;
  }

  async updateCard(
    cardId: string,
    userId: string,
    data: { title?: string; description?: string; dueDate?: string | null },
  ) {
    const card = await this.prisma.kanbanCard.findUnique({ where: { id: cardId }, select: { boardId: true } });
    if (!card) throw new NotFoundException('Card not found');
    await this.assertEditor(card.boardId, userId);
    return this.prisma.kanbanCard.update({
      where: { id: cardId },
      data: {
        ...data,
        dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
      },
      select: CARD_SELECT,
    });
  }

  async moveCard(cardId: string, userId: string, toColumnId: string, newPosition: number) {
    const card = await this.prisma.kanbanCard.findUnique({ where: { id: cardId }, select: { boardId: true, columnId: true } });
    if (!card) throw new NotFoundException('Card not found');
    await this.assertEditor(card.boardId, userId);
    return this.prisma.kanbanCard.update({
      where: { id: cardId },
      data: { columnId: toColumnId, position: newPosition },
      select: CARD_SELECT,
    });
  }

  async deleteCard(cardId: string, userId: string) {
    const card = await this.prisma.kanbanCard.findUnique({ where: { id: cardId }, select: { boardId: true } });
    if (!card) throw new NotFoundException('Card not found');
    await this.assertEditor(card.boardId, userId);
    return this.prisma.kanbanCard.delete({ where: { id: cardId } });
  }

  async setCardAssignees(cardId: string, userId: string, assigneeIds: string[]) {
    const card = await this.prisma.kanbanCard.findUnique({ where: { id: cardId }, select: { boardId: true } });
    if (!card) throw new NotFoundException('Card not found');
    await this.assertEditor(card.boardId, userId);
    await this.prisma.kanbanCardAssignee.deleteMany({ where: { cardId } });
    if (assigneeIds.length > 0) {
      await this.prisma.kanbanCardAssignee.createMany({
        data: assigneeIds.map((uid) => ({ cardId, userId: uid })),
      });
    }
    return this.getCard(cardId, userId);
  }

  // ── Subtasks ───────────────────────────────────────────────────────────────

  async createSubtask(cardId: string, userId: string, title: string) {
    const card = await this.prisma.kanbanCard.findUnique({ where: { id: cardId }, select: { boardId: true } });
    if (!card) throw new NotFoundException('Card not found');
    await this.assertEditor(card.boardId, userId);
    const maxPos = await this.prisma.kanbanSubtask.aggregate({ where: { cardId }, _max: { position: true } });
    return this.prisma.kanbanSubtask.create({
      data: { cardId, title, position: (maxPos._max.position ?? 0) + 1 },
    });
  }

  async updateSubtask(subtaskId: string, userId: string, data: { title?: string; isCompleted?: boolean }) {
    const sub = await this.prisma.kanbanSubtask.findUnique({
      where: { id: subtaskId },
      include: { card: { select: { boardId: true } } },
    });
    if (!sub) throw new NotFoundException('Subtask not found');
    await this.assertEditor(sub.card.boardId, userId);
    return this.prisma.kanbanSubtask.update({ where: { id: subtaskId }, data });
  }

  async deleteSubtask(subtaskId: string, userId: string) {
    const sub = await this.prisma.kanbanSubtask.findUnique({
      where: { id: subtaskId },
      include: { card: { select: { boardId: true } } },
    });
    if (!sub) throw new NotFoundException('Subtask not found');
    await this.assertEditor(sub.card.boardId, userId);
    return this.prisma.kanbanSubtask.delete({ where: { id: subtaskId } });
  }

  // ── Labels ─────────────────────────────────────────────────────────────────

  async createLabel(boardId: string, userId: string, data: { name: string; color: string }) {
    await this.assertEditor(boardId, userId);
    return this.prisma.kanbanLabel.create({ data: { boardId, ...data } });
  }

  async deleteLabel(labelId: string, userId: string) {
    const label = await this.prisma.kanbanLabel.findUnique({ where: { id: labelId } });
    if (!label) throw new NotFoundException('Label not found');
    await this.assertEditor(label.boardId, userId);
    return this.prisma.kanbanLabel.delete({ where: { id: labelId } });
  }

  // ── Access helpers ─────────────────────────────────────────────────────────

  private async getBoardMember(boardId: string, userId: string) {
    return this.prisma.kanbanBoardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
  }

  private assertMember(board: { createdBy: string; members: { userId: string }[] }, userId: string) {
    const isMember = board.createdBy === userId || board.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not a board member');
  }

  private async assertMemberByBoard(boardId: string, userId: string) {
    const board = await this.prisma.kanbanBoard.findUnique({
      where: { id: boardId },
      select: { createdBy: true, members: { select: { userId: true } } },
    });
    if (!board) throw new NotFoundException('Board not found');
    this.assertMember(board, userId);
  }

  private async assertEditor(boardId: string, userId: string) {
    const board = await this.prisma.kanbanBoard.findUnique({
      where: { id: boardId },
      select: { createdBy: true, members: { select: { userId: true, role: true } } },
    });
    if (!board) throw new NotFoundException('Board not found');
    if (board.createdBy === userId) return;
    const member = board.members.find((m) => m.userId === userId);
    if (!member || member.role === 'viewer') throw new ForbiddenException('Viewer cannot edit');
  }

  private async assertOwner(boardId: string, userId: string) {
    const member = await this.getBoardMember(boardId, userId);
    if (!member || member.role !== 'owner') throw new ForbiddenException('Only board owner can perform this action');
  }

  // ── Helpers for dashboard ──────────────────────────────────────────────────

  async getAssignedCards(userId: string) {
    return this.prisma.kanbanCard.findMany({
      where: { assignees: { some: { userId } } },
      select: { id: true, title: true, dueDate: true, boardId: true, columnId: true,
        column: { select: { name: true } }, board: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }

  async getUpcomingDeadlines(userId: string) {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 3);
    return this.prisma.kanbanCard.findMany({
      where: {
        assignees: { some: { userId } },
        dueDate: { gte: new Date(), lte: horizon },
      },
      select: { id: true, title: true, dueDate: true, boardId: true,
        column: { select: { name: true } }, board: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }
}
