import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get()
  findAll() { return this.orgs.findAll(); }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.orgs.findOne(id); }

  @Get(':id/stats')
  getStats(@Param('id', ParseUUIDPipe) id: string) { return this.orgs.getStats(id); }

  @Post()
  @Roles('superadmin')
  create(@Body() body: { name: string; slug: string }) { return this.orgs.create(body); }

  @Patch(':id')
  @Roles('superadmin', 'admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: { name?: string; slug?: string }) {
    return this.orgs.update(id, body);
  }
}
