import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { FilesModule } from './modules/files/files.module';
import { ChatModule } from './modules/chat/chat.module';
import { KanbanModule } from './modules/kanban/kanban.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OutlookModule } from './modules/outlook/outlook.module';
import { TeamsModule } from './modules/teams/teams.module';
import { MicrosoftModule } from './modules/microsoft/microsoft.module';
import { OAuthModule } from './modules/oauth/oauth.module';
import { HealthModule } from './modules/health/health.module';
import { KeycloakAdminModule } from './modules/keycloak-admin/keycloak-admin.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    PrismaModule,
    AuthModule,
    KeycloakAdminModule,
    UsersModule,
    OrganizationsModule,
    DepartmentsModule,
    FilesModule,
    ChatModule,
    KanbanModule,
    DashboardModule,
    NotificationsModule,
    MicrosoftModule,
    OAuthModule,
    OutlookModule,
    TeamsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
