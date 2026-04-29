import { Module } from '@nestjs/common';
import { OAuthController } from './oauth.controller';
import { MicrosoftModule } from '../microsoft/microsoft.module';

@Module({
  imports: [MicrosoftModule],
  controllers: [OAuthController],
})
export class OAuthModule {}
