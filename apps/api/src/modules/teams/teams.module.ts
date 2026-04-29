import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { MicrosoftModule } from '../microsoft/microsoft.module';

@Module({
  imports: [MicrosoftModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
