import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { FilesModule } from '../files/files.module';
import { KeycloakAdminModule } from '../keycloak-admin/keycloak-admin.module';

@Module({
  imports: [FilesModule, KeycloakAdminModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
