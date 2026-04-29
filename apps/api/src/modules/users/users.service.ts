import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { KeycloakAdminService } from '../keycloak-admin/keycloak-admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import type { Prisma } from '@prisma/client';

const USER_SELECT = {
  id: true,
  keycloakSub: true,
  organizationId: true,
  departmentId: true,
  firstName: true,
  lastName: true,
  middleName: true,
  email: true,
  phone: true,
  gender: true,
  dateOfBirth: true,
  address: true,
  positionName: true,
  role: true,
  photoUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private files: FilesService,
    private keycloakAdmin: KeycloakAdminService,
  ) {}

  async findAll(query: QueryUsersDto) {
    const { page = 1, limit = 20, organizationId, departmentId, role, search, isActive } = query;

    const where: Prisma.UserWhereInput = {};
    if (organizationId) where.organizationId = organizationId;
    if (departmentId) where.departmentId = departmentId;
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { positionName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, hasNextPage: page * limit < total };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SELECT,
        organization: { select: { id: true, name: true, slug: true } },
        department: { select: { id: true, name: true } },
        managedBy: {
          select: {
            isPrimary: true,
            manager: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByKeycloakSub(sub: string) {
    return this.prisma.user.findUnique({ where: { keycloakSub: sub }, select: USER_SELECT });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const keycloakSub = await this.keycloakAdmin.createUser({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
      role: dto.role,
    });

    try {
      return await this.prisma.user.create({
        data: {
          id: keycloakSub,
          keycloakSub,
          organizationId: dto.organizationId,
          departmentId: dto.departmentId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName,
          email: dto.email,
          phone: dto.phone,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          address: dto.address,
          positionName: dto.positionName,
          role: dto.role,
        },
        select: USER_SELECT,
      });
    } catch (err) {
      await this.keycloakAdmin.deleteUser(keycloakSub).catch(() => {});
      throw err;
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      select: USER_SELECT,
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: USER_SELECT,
    });
  }

  async getPhotoUploadUrl(userId: string) {
    await this.findOne(userId);
    const key = `${userId}/avatar.jpg`;
    const url = await this.files.getPresignedUploadUrl('avatars', key, 'image/jpeg');
    return { uploadUrl: url, key };
  }

  async updatePhotoUrl(userId: string, key: string) {
    const downloadUrl = await this.files.getPresignedDownloadUrl('avatars', key);
    return this.prisma.user.update({
      where: { id: userId },
      data: { photoUrl: downloadUrl },
      select: { id: true, photoUrl: true },
    });
  }

  async setManagers(userId: string, managerIds: { managerId: string; isPrimary: boolean }[]) {
    await this.findOne(userId);
    await this.prisma.userManager.deleteMany({ where: { userId } });
    if (managerIds.length > 0) {
      await this.prisma.userManager.createMany({
        data: managerIds.map((m) => ({ userId, managerId: m.managerId, isPrimary: m.isPrimary })),
      });
    }
    return this.findOne(userId);
  }

  async getWorkHistory(userId: string) {
    await this.findOne(userId);
    return this.prisma.workHistory.findMany({
      where: { userId },
      orderBy: { effectiveDate: 'desc' },
      include: {
        fromDepartment: { select: { id: true, name: true } },
        toDepartment: { select: { id: true, name: true } },
        recorder: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async addWorkHistory(
    userId: string,
    recordedBy: string,
    data: {
      eventType: any;
      fromDepartmentId?: string;
      toDepartmentId?: string;
      fromPosition?: string;
      toPosition?: string;
      fromRole?: any;
      toRole?: any;
      effectiveDate: string;
      notes?: string;
    },
  ) {
    await this.findOne(userId);
    return this.prisma.workHistory.create({
      data: {
        userId,
        recordedBy,
        eventType: data.eventType,
        fromDepartmentId: data.fromDepartmentId,
        toDepartmentId: data.toDepartmentId,
        fromPosition: data.fromPosition,
        toPosition: data.toPosition,
        fromRole: data.fromRole,
        toRole: data.toRole,
        effectiveDate: new Date(data.effectiveDate),
        notes: data.notes,
      },
    });
  }
}
