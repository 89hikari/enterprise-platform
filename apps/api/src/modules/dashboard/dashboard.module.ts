import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { KanbanModule } from '../kanban/kanban.module';

@Module({
  imports: [KanbanModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
