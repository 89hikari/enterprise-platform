import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ChessService } from './chess.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/guards/jwt-auth.guard';

@Controller('chess')
export class ChessController {
  constructor(private readonly chess: ChessService) {}

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
    return this.chess.createRoom(dto.name, dto.timeControl ?? null, user.sub);
  }
}
