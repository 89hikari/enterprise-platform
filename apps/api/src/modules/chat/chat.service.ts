import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { SendMessageDto } from './dto/send-message.dto';

const SENDER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
};

const MESSAGE_SELECT = {
  id: true,
  roomId: true,
  senderId: true,
  sender: { select: SENDER_SELECT },
  messageType: true,
  content: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  durationSeconds: true,
  replyToMessageId: true,
  replyTo: {
    select: {
      id: true,
      content: true,
      messageType: true,
      sender: { select: SENDER_SELECT },
    },
  },
  isDeleted: true,
  createdAt: true,
  editedAt: true,
};

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ── Rooms ──────────────────────────────────────────────────────────────────

  async getUserRooms(userId: string) {
    const memberships = await this.prisma.chatRoomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            members: {
              include: { user: { select: SENDER_SELECT } },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: MESSAGE_SELECT,
            },
          },
        },
      },
      orderBy: { room: { updatedAt: 'desc' } },
    });

    return memberships.map((m) => {
      const room = m.room;
      const lastMessage = room.messages[0] ?? null;

      // For direct rooms, derive name/avatar from the other member
      let displayName = room.name;
      let avatarUrl = room.avatarUrl;
      if (room.type === 'direct') {
        const other = room.members.find((rm) => rm.userId !== userId);
        if (other) {
          displayName = `${other.user.firstName} ${other.user.lastName}`;
          avatarUrl = other.user.photoUrl;
        }
      }

      return {
        id: room.id,
        type: room.type,
        name: displayName,
        avatarUrl,
        lastMessage,
        lastReadAt: m.lastReadAt,
        members: room.members.map((rm) => rm.user),
      };
    });
  }

  async getRoom(roomId: string, userId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        members: { include: { user: { select: { ...SENDER_SELECT, email: true, positionName: true } } } },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    const isMember = room.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not a member of this room');
    return room;
  }

  async createRoom(dto: CreateRoomDto, createdBy: string) {
    const allMemberIds = [...new Set([createdBy, ...dto.memberIds])];

    // Prevent duplicate direct rooms
    if (dto.type === 'direct' && allMemberIds.length === 2) {
      const existing = await this.findDirectRoom(allMemberIds[0], allMemberIds[1]);
      if (existing) return existing;
    }

    return this.prisma.chatRoom.create({
      data: {
        type: dto.type,
        name: dto.name,
        organizationId: await this.getUserOrgId(createdBy),
        createdBy,
        members: {
          create: allMemberIds.map((uid) => ({ userId: uid })),
        },
      },
      include: {
        members: { include: { user: { select: SENDER_SELECT } } },
      },
    });
  }

  private async findDirectRoom(userA: string, userB: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        type: 'direct',
        members: { some: { userId: userA } },
      },
      include: { members: true },
    });
    return rooms.find(
      (r) =>
        r.members.length === 2 &&
        r.members.some((m) => m.userId === userA) &&
        r.members.some((m) => m.userId === userB),
    ) ?? null;
  }

  async addMembers(roomId: string, memberIds: string[], requesterId: string) {
    await this.getRoom(roomId, requesterId);
    await this.prisma.chatRoomMember.createMany({
      data: memberIds.map((userId) => ({ roomId, userId })),
      skipDuplicates: true,
    });
    return this.getRoom(roomId, requesterId);
  }

  async removeMember(roomId: string, userId: string, requesterId: string) {
    await this.getRoom(roomId, requesterId);
    await this.prisma.chatRoomMember.delete({
      where: { roomId_userId: { roomId, userId } },
    });
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  async getMessages(roomId: string, userId: string, cursor?: string, limit = 50) {
    await this.getRoom(roomId, userId);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      select: MESSAGE_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? data[data.length - 1].createdAt.toISOString() : null;

    return { data: data.reverse(), nextCursor, hasMore };
  }

  async saveMessage(
    roomId: string,
    senderId: string,
    dto: SendMessageDto,
  ) {
    await this.getRoom(roomId, senderId);

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId,
        messageType: dto.messageType,
        content: dto.content,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize ? BigInt(dto.fileSize) : null,
        durationSeconds: dto.durationSeconds,
        replyToMessageId: dto.replyToMessageId,
      },
      select: MESSAGE_SELECT,
    });

    // Touch room updatedAt so rooms sort by last activity
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.senderId !== userId) throw new ForbiddenException('Cannot delete others messages');
    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true, content: null },
      select: { id: true, roomId: true, isDeleted: true },
    });
  }

  async markRead(roomId: string, userId: string) {
    await this.prisma.chatRoomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { lastReadAt: new Date() },
    });
  }

  async getUnreadCount(roomId: string, userId: string): Promise<number> {
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member?.lastReadAt) {
      return this.prisma.chatMessage.count({ where: { roomId, isDeleted: false } });
    }
    return this.prisma.chatMessage.count({
      where: { roomId, isDeleted: false, createdAt: { gt: member.lastReadAt } },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async getUserOrgId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user.organizationId;
  }

  async getRoomMemberIds(roomId: string): Promise<string[]> {
    const members = await this.prisma.chatRoomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }
}
