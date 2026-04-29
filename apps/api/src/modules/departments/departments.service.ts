import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId?: string) {
    return this.prisma.department.findMany({
      where: organizationId ? { organizationId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: { childDepartments: true },
    });
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  create(data: { name: string; organizationId: string; parentDepartmentId?: string }) {
    return this.prisma.department.create({ data });
  }

  async update(id: string, data: { name?: string; parentDepartmentId?: string }) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.department.delete({ where: { id } });
  }

  async getMembers(id: string, page = 1, limit = 20) {
    await this.findOne(id);
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { departmentId: id },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          positionName: true, role: true, photoUrl: true,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where: { departmentId: id } }),
    ]);
    return { data, total, page, limit, hasNextPage: page * limit < total };
  }
}
