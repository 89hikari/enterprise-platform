import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.users.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @Roles('superadmin', 'admin')
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles('superadmin', 'admin')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.deactivate(id);
  }

  @Post(':id/photo/presign')
  getPhotoUploadUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getPhotoUploadUrl(id);
  }

  @Patch(':id/photo')
  updatePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('key') key: string,
  ) {
    return this.users.updatePhotoUrl(id, key);
  }

  @Patch(':id/managers')
  setManagers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { managers: { managerId: string; isPrimary: boolean }[] },
  ) {
    return this.users.setManagers(id, body.managers);
  }

  @Get(':id/work-history')
  getWorkHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getWorkHistory(id);
  }

  @Post(':id/work-history')
  @Roles('superadmin', 'admin', 'hr_manager')
  addWorkHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @CurrentUser() user: JwtUser,
  ) {
    return this.users.addWorkHistory(id, user.sub, body);
  }
}
