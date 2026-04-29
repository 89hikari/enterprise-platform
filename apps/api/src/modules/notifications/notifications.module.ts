import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { DeadlineProcessor } from './deadline.processor';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, DeadlineProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
