import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ChessService } from './chess.service';
import { ChessGateway } from './chess.gateway';
import { CreateRoomDto } from './dto/create-room.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/guards/jwt-auth.guard';

@Controller('chess')
export class ChessController {
  constructor(
    private readonly chess: ChessService,
    private readonly gateway: ChessGateway,
  ) {}

  @Get('rooms')
  getRooms() {
    return this.chess.getRooms();
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.chess.getLeaderboard();
  }

  @Post('rooms')
  @HttpCode(HttpStatus.CREATED)
  async createRoom(
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: JwtUser,
  ) {
    const room = await this.chess.createRoom(dto.name, dto.timeControl ?? null, user.sub);
    await this.gateway.broadcastRoomList();
    return room;
  }
}
