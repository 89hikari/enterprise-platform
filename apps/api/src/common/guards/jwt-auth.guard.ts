import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { UserRole } from '@enterprise/shared';

export interface JwtUser {
  sub: string;
  email: string;
  roles: UserRole[];
  preferred_username: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwks: jwksClient.JwksClient;

  constructor(
    private reflector: Reflector,
    private config: ConfigService,
  ) {
    this.jwks = jwksClient.default({
      jwksUri: this.config.get<string>('app.keycloak.jwksUri')!,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 min
      rateLimit: true,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('No token provided');

    try {
      const decoded = await this.verifyToken(token);
      request.user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader: string | undefined = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  }

  private verifyToken(token: string): Promise<JwtUser> {
    return new Promise((resolve, reject) => {
      const getKey: jwt.GetPublicKeyOrSecret = (
        header: jwt.JwtHeader,
        callback: jwt.SigningKeyCallback,
      ) => {
        this.jwks.getSigningKey(header.kid, (err: Error | null, key) => {
          if (err) return callback(err);
          callback(null, key?.getPublicKey());
        });
      };

      jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined) => {
        if (err) return reject(err);
        const payload = decoded as jwt.JwtPayload & { roles?: string[]; preferred_username?: string };
        resolve({
          sub: payload.sub ?? '',
          email: payload.email ?? '',
          roles: (payload.roles ?? []) as UserRole[],
          preferred_username: payload.preferred_username ?? '',
        });
      });
    });
  }
}
