import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import axios from 'axios';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const TOKEN_URL = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token';
const AUTH_URL  = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

@Injectable()
export class MicrosoftService {
  private readonly logger = new Logger(MicrosoftService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const keyHex = this.config.get<string>('MICROSOFT_ENCRYPTION_KEY');
    // Derive a 32-byte key from whatever is configured (or fall back to a dev default)
    const keySource = keyHex ?? 'dev-only-insecure-key-change-me!!';
    this.encryptionKey = crypto.createHash('sha256').update(keySource).digest();
  }

  // ── Encryption ─────────────────────────────────────────────────────────────

  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
  }

  private decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, dataHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(data).toString('utf8') + decipher.final('utf8');
  }

  // ── OAuth URLs ─────────────────────────────────────────────────────────────

  buildAuthUrl(state: string, scopes: string[]): string {
    const tenant  = this.config.get('MICROSOFT_TENANT_ID') ?? 'common';
    const clientId = this.config.get('MICROSOFT_CLIENT_ID') ?? '';
    const redirect = this.config.get('MICROSOFT_REDIRECT_URI') ?? '';
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirect,
      response_mode: 'query',
      scope: scopes.join(' '),
      state,
    });
    return AUTH_URL.replace('{tenant}', tenant) + '?' + params.toString();
  }

  async exchangeCode(code: string, scopes: string[]): Promise<TokenResponse> {
    const tenant    = this.config.get('MICROSOFT_TENANT_ID') ?? 'common';
    const clientId  = this.config.get('MICROSOFT_CLIENT_ID') ?? '';
    const clientSecret = this.config.get('MICROSOFT_CLIENT_SECRET') ?? '';
    const redirect  = this.config.get('MICROSOFT_REDIRECT_URI') ?? '';

    const res = await axios.post<TokenResponse>(
      TOKEN_URL.replace('{tenant}', tenant),
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirect,
        grant_type: 'authorization_code',
        scope: scopes.join(' '),
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    return res.data;
  }

  async saveTokens(userId: string, tokens: TokenResponse): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const data = {
      accessToken: this.encrypt(tokens.access_token),
      refreshToken: this.encrypt(tokens.refresh_token),
      expiresAt,
      scopes: tokens.scope.split(' '),
    };
    await this.prisma.microsoftToken.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  // ── Token access with auto-refresh ────────────────────────────────────────

  async getAccessToken(userId: string): Promise<string> {
    const record = await this.prisma.microsoftToken.findUnique({ where: { userId } });
    if (!record) throw new UnauthorizedException('Microsoft account not connected');

    // Refresh if expiring within 5 minutes
    if (record.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
      const refreshToken = this.decrypt(record.refreshToken);
      const tokens = await this.refreshAccessToken(refreshToken, record.scopes);
      await this.saveTokens(userId, tokens);
      return tokens.access_token;
    }

    return this.decrypt(record.accessToken);
  }

  private async refreshAccessToken(refreshToken: string, scopes: string[]): Promise<TokenResponse> {
    const tenant     = this.config.get('MICROSOFT_TENANT_ID') ?? 'common';
    const clientId   = this.config.get('MICROSOFT_CLIENT_ID') ?? '';
    const clientSecret = this.config.get('MICROSOFT_CLIENT_SECRET') ?? '';
    const redirect   = this.config.get('MICROSOFT_REDIRECT_URI') ?? '';

    try {
      const res = await axios.post<TokenResponse>(
        TOKEN_URL.replace('{tenant}', tenant),
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          redirect_uri: redirect,
          grant_type: 'refresh_token',
          scope: scopes.join(' '),
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      return res.data;
    } catch (err) {
      throw new UnauthorizedException('Microsoft token refresh failed — please reconnect');
    }
  }

  isConnected(userId: string) {
    return this.prisma.microsoftToken.findUnique({ where: { userId }, select: { userId: true, scopes: true } });
  }

  async disconnect(userId: string): Promise<void> {
    await this.prisma.microsoftToken.deleteMany({ where: { userId } });
  }

  // ── Graph API helpers ──────────────────────────────────────────────────────

  async graphGet<T>(userId: string, path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getAccessToken(userId);
    const url = `${GRAPH_BASE}${path}`;
    const res = await axios.get<T>(url, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return res.data;
  }

  async graphPost<T>(userId: string, path: string, body: unknown): Promise<T> {
    const token = await this.getAccessToken(userId);
    const res = await axios.post<T>(`${GRAPH_BASE}${path}`, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return res.data;
  }
}
