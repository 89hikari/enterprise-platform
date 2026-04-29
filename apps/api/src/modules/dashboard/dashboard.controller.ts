import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUser } from '../../common/guards/jwt-auth.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  get(@CurrentUser() u: JwtUser) {
    return this.dashboard.getDashboard(u.sub);
  }

  // ── News posts ─────────────────────────────────────────────────────────────

  @Get('news')
  getNews(@CurrentUser() u: JwtUser) {
    return this.prisma.newsPost.findMany({
      where: { author: { keycloakSub: u.sub } },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: 30,
    });
  }

  @Post('news')
  @Roles('superadmin', 'admin', 'hr_manager', 'manager')
  async createNews(
    @Body() body: { title: string; content: string; isPinned?: boolean },
    @CurrentUser() u: JwtUser,
  ) {
    const author = await this.prisma.user.findUnique({ where: { keycloakSub: u.sub }, select: { id: true, organizationId: true } });
    if (!author) return null;
    return this.prisma.newsPost.create({
      data: {
        title: body.title,
        content: body.content,
        isPinned: body.isPinned ?? false,
        organizationId: author.organizationId,
        authorId: author.id,
      },
    });
  }

  @Patch('news/:id')
  @Roles('superadmin', 'admin', 'hr_manager', 'manager')
  updateNews(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { title?: string; content?: string; isPinned?: boolean },
  ) {
    return this.prisma.newsPost.update({ where: { id }, data: body });
  }
}
