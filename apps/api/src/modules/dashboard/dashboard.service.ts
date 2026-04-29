import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KanbanService } from '../kanban/kanban.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private kanban: KanbanService,
  ) {}

  async getDashboard(keycloakSub: string) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakSub },
      select: { id: true, organizationId: true },
    });
    if (!user) return null;

    const [news, assigned, upcoming] = await Promise.all([
      this.prisma.newsPost.findMany({
        where: { organizationId: user.organizationId },
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        take: 15,
        include: {
          author: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        },
      }),
      this.kanban.getAssignedCards(user.id),
      this.kanban.getUpcomingDeadlines(user.id),
    ]);

    return { news, assigned, upcoming };
  }
}
