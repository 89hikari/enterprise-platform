import { Module } from '@nestjs/common';
import { KanbanController } from './kanban.controller';
import { KanbanService } from './kanban.service';
import { KanbanGateway } from './kanban.gateway';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [KanbanController],
  providers: [KanbanService, KanbanGateway],
  exports: [KanbanService, KanbanGateway],
})
export class KanbanModule {}
