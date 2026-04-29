import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly depts: DepartmentsService) {}

  @Get()
  findAll(@Query('organizationId') orgId?: string) { return this.depts.findAll(orgId); }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.depts.findOne(id); }

  @Get(':id/members')
  getMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) { return this.depts.getMembers(id, page, limit); }

  @Post()
  @Roles('superadmin', 'admin')
  create(@Body() body: { name: string; organizationId: string; parentDepartmentId?: string }) {
    return this.depts.create(body);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name?: string; parentDepartmentId?: string },
  ) { return this.depts.update(id, body); }

  @Delete(':id')
  @Roles('superadmin', 'admin')
  remove(@Param('id', ParseUUIDPipe) id: string) { return this.depts.remove(id); }
}
