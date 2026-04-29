import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { MicrosoftService } from '../microsoft/microsoft.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { JwtUser } from '../../common/guards/jwt-auth.guard';

const OUTLOOK_SCOPES = ['offline_access', 'Mail.Read', 'Mail.Send'];
const TEAMS_SCOPES   = ['offline_access', 'ChannelMessage.Read.All', 'ChannelMessage.Send', 'Team.ReadBasic.All'];

// State encodes: <product>:<userId>
function encodeState(product: string, userId: string) {
  return Buffer.from(`${product}:${userId}`).toString('base64url');
}
function decodeState(state: string): { product: string; userId: string } | null {
  try {
    const [product, userId] = Buffer.from(state, 'base64url').toString().split(':');
    if (!product || !userId) return null;
    return { product, userId };
  } catch {
    return null;
  }
}

@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly microsoft: MicrosoftService,
    private readonly config: ConfigService,
  ) {}

  @Get('microsoft/authorize')
  authorize(
    @Query('product') product: 'outlook' | 'teams',
    @CurrentUser() u: JwtUser,
    @Res() res: Response,
  ) {
    const scopes = product === 'teams' ? TEAMS_SCOPES : OUTLOOK_SCOPES;
    const state  = encodeState(product ?? 'outlook', u.sub);
    const url    = this.microsoft.buildAuthUrl(state, scopes);
    return res.redirect(url);
  }

  @Public()
  @Get('microsoft/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDesc: string,
    @Res() res: Response,
  ) {
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';

    if (error) {
      return res.redirect(`${appUrl}/outlook?error=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
      throw new BadRequestException('Missing code or state');
    }

    const decoded = decodeState(state);
    if (!decoded) throw new BadRequestException('Invalid state');
    const { product, userId } = decoded;

    const scopes = product === 'teams' ? TEAMS_SCOPES : OUTLOOK_SCOPES;

    try {
      const tokens = await this.microsoft.exchangeCode(code, scopes);
      await this.microsoft.saveTokens(userId, tokens);
    } catch (err) {
      return res.redirect(`${appUrl}/${product}?error=token_exchange_failed`);
    }

    return res.redirect(`${appUrl}/${product}`);
  }

  @Get('microsoft/disconnect')
  async disconnect(@Query('product') product: string, @CurrentUser() u: JwtUser, @Res() res: Response) {
    await this.microsoft.disconnect(u.sub);
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    return res.redirect(`${appUrl}/${product ?? 'outlook'}`);
  }
}
