import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import axios from 'axios';

@Controller('auth')
export class AuthController {
  constructor(private config: ConfigService) {}

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('token/refresh')
  @HttpCode(200)
  async refreshToken(@Body('refresh_token') refreshToken: string) {
    const { url, realm, clientId, clientSecret } = this.config.get('app.keycloak');
    const tokenUrl = `${url}/realms/${realm}/protocol/openid-connect/token`;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
  }
}
