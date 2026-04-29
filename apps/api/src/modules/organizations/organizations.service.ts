import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.organization.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  async create(data: { name: string; slug: string }) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('Slug already in use');
    return this.prisma.organization.create({ data });
  }

  async update(id: string, data: { name?: string; slug?: string }) {
    await this.findOne(id);
    return this.prisma.organization.update({ where: { id }, data });
  }

  async getStats(id: string) {
    await this.findOne(id);
    const [userCount, departmentCount] = await Promise.all([
      this.prisma.user.count({ where: { organizationId: id } }),
      this.prisma.department.count({ where: { organizationId: id } }),
    ]);
    return { userCount, departmentCount };
  }
}
