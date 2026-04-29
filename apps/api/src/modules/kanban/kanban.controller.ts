import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  Query, ParseUUIDPipe, HttpCode,
} from '@nestjs/common';
import { KanbanService } from './kanban.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/guards/jwt-auth.guard';

@Controller('kanban')
export class KanbanController {
  constructor(private readonly kanban: KanbanService) {}

  // ── Boards ─────────────────────────────────────────────────────────────────

  @Get('boards')
  getBoards(@CurrentUser() u: JwtUser, @Query('organizationId') orgId?: string) {
    return this.kanban.getBoards(u.sub, orgId);
  }

  @Post('boards')
  createBoard(@Body() body: { name: string; description?: string; organizationId?: string }, @CurrentUser() u: JwtUser) {
    return this.kanban.createBoard(body, u.sub);
  }

  @Get('boards/:id')
  getBoard(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) {
    return this.kanban.getBoard(id, u.sub);
  }

  @Patch('boards/:id')
  updateBoard(@Param('id', ParseUUIDPipe) id: string, @Body() body: { name?: string; description?: string }, @CurrentUser() u: JwtUser) {
    return this.kanban.updateBoard(id, u.sub, body);
  }

  @Delete('boards/:id')
  @HttpCode(204)
  archiveBoard(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) {
    return this.kanban.archiveBoard(id, u.sub);
  }

  @Post('boards/:id/members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { userId: string; role: string },
    @CurrentUser() u: JwtUser,
  ) {
    return this.kanban.addBoardMember(id, body.userId, body.role, u.sub);
  }

  // ── Columns ────────────────────────────────────────────────────────────────

  @Post('boards/:boardId/columns')
  createColumn(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body() body: { name: string; color?: string },
    @CurrentUser() u: JwtUser,
  ) {
    return this.kanban.createColumn(boardId, u.sub, body);
  }

  @Patch('columns/:id')
  updateColumn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name?: string; color?: string; position?: number },
    @CurrentUser() u: JwtUser,
  ) {
    return this.kanban.updateColumn(id, u.sub, body);
  }

  @Delete('columns/:id')
  @HttpCode(204)
  deleteColumn(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) {
    return this.kanban.deleteColumn(id, u.sub);
  }

  // ── Cards ──────────────────────────────────────────────────────────────────

  @Post('columns/:columnId/cards')
  createCard(
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @Body() body: { title: string; description?: string; dueDate?: string; assigneeIds?: string[]; labelIds?: string[] },
    @CurrentUser() u: JwtUser,
  ) {
    return this.kanban.createCard(columnId, u.sub, body);
  }

  @Get('cards/:id')
  getCard(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) {
    return this.kanban.getCard(id, u.sub);
  }

  @Patch('cards/:id')
  updateCard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { title?: string; description?: string; dueDate?: string | null },
    @CurrentUser() u: JwtUser,
  ) {
    return this.kanban.updateCard(id, u.sub, body);
  }

  @Patch('cards/:id/move')
  moveCard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { toColumnId: string; newPosition: number },
    @CurrentUser() u: JwtUser,
  ) {
    return this.kanban.moveCard(id, u.sub, body.toColumnId, body.newPosition);
  }

  @Patch('cards/:id/assignees')
  setAssignees(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('assigneeIds') assigneeIds: string[],
    @CurrentUser() u: JwtUser,
  ) {
    return this.kanban.setCardAssignees(id, u.sub, assigneeIds);
  }

  @Delete('cards/:id')
  @HttpCode(204)
  deleteCard(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) {
    return this.kanban.deleteCard(id, u.sub);
  }

  // ── Subtasks ───────────────────────────────────────────────────────────────

  @Post('cards/:cardId/subtasks')
  createSubtask(
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body('title') title: string,
    @CurrentUser() u: JwtUser,
  ) {
    return this.kanban.createSubtask(cardId, u.sub, title);
  }

  @Patch('subtasks/:id')
  updateSubtask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { title?: string; isCompleted?: boolean },
    @CurrentUser() u: JwtUser,
  ) {
    return this.kanban.updateSubtask(id, u.sub, body);
  }

  @Delete('subtasks/:id')
  @HttpCode(204)
  deleteSubtask(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) {
    return this.kanban.deleteSubtask(id, u.sub);
  }

  // ── Labels ─────────────────────────────────────────────────────────────────

  @Post('boards/:boardId/labels')
  createLabel(
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body() body: { name: string; color: string },
    @CurrentUser() u: JwtUser,
  ) {
    return this.kanban.createLabel(boardId, u.sub, body);
  }

  @Delete('labels/:id')
  @HttpCode(204)
  deleteLabel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: JwtUser) {
    return this.kanban.deleteLabel(id, u.sub);
  }
}
