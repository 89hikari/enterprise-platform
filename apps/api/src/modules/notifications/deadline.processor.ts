import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class DeadlineProcessor {
  private readonly logger = new Logger(DeadlineProcessor.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // Runs every hour; finds cards due within 24 hours that haven't been notified yet
  @Cron(CronExpression.EVERY_HOUR)
  async checkDeadlines() {
    this.logger.debug('Running deadline check…');
    const now = new Date();
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const cards = await this.prisma.kanbanCard.findMany({
      where: {
        dueDate: { gte: now, lte: horizon },
        assignees: { some: {} },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        boardId: true,
        assignees: { select: { userId: true } },
      },
    });

    for (const card of cards) {
      for (const { userId } of card.assignees) {
        // Skip if an unread deadline notification for this card already exists
        const existing = await this.prisma.notification.findFirst({
          where: {
            userId,
            type: 'TASK_DEADLINE_APPROACHING',
            referenceId: card.id,
            isRead: false,
          },
        });
        if (existing) continue;

        const hoursLeft = Math.round((card.dueDate!.getTime() - now.getTime()) / 3_600_000);
        await this.notifications.create({
          userId,
          type: 'TASK_DEADLINE_APPROACHING',
          title: 'Task deadline approaching',
          body: `"${card.title}" is due in ${hoursLeft}h`,
          referenceType: 'kanban_card',
          referenceId: card.id,
        });
      }
    }

    this.logger.debug(`Deadline check done — processed ${cards.length} cards`);
  }
}
