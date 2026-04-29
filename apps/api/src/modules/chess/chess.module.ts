import { Module } from '@nestjs/common';
import { ChessController } from './chess.controller';
import { ChessService } from './chess.service';
import { ChessGateway } from './chess.gateway';

@Module({
  controllers: [ChessController],
  providers: [ChessService, ChessGateway],
})
export class ChessModule {}
