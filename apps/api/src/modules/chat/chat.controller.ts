import {
  Controller, Get, Post, Delete, Param, Body, Query,
  ParseUUIDPipe, HttpCode,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/guards/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  // ── Rooms ──────────────────────────────────────────────────────────────────

  @Get('rooms')
  getRooms(@CurrentUser() user: JwtUser) {
    return this.chat.getUserRooms(user.sub);
  }

  @Post('rooms')
  createRoom(@Body() dto: CreateRoomDto, @CurrentUser() user: JwtUser) {
    return this.chat.createRoom(dto, user.sub);
  }

  @Get('rooms/:id')
  getRoom(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.chat.getRoom(id, user.sub);
  }

  @Post('rooms/:id/members')
  addMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('memberIds') memberIds: string[],
    @CurrentUser() user: JwtUser,
  ) {
    return this.chat.addMembers(id, memberIds, user.sub);
  }

  @Delete('rooms/:id/members/:userId')
  @HttpCode(204)
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chat.removeMember(id, userId, user.sub);
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  @Get('rooms/:id/messages')
  getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.chat.getMessages(id, user!.sub, cursor, limit ? parseInt(limit, 10) : 50);
  }

  @Post('rooms/:id/messages')
  sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chat.saveMessage(id, user.sub, dto);
  }

  @Delete('messages/:messageId')
  @HttpCode(204)
  deleteMessage(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chat.deleteMessage(messageId, user.sub);
  }
}
