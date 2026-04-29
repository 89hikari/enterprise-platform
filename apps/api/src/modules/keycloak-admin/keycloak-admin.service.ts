import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface CachedToken {
  access_token: string;
  expires_at: number;
}

@Injectable()
export class KeycloakAdminService {
  private cached: CachedToken | null = null;

  constructor(private config: ConfigService) {}

  private get baseUrl() {
    const url = this.config.get<string>('app.keycloak.url')!;
    const realm = this.config.get<string>('app.keycloak.realm')!;
    return `${url}/admin/realms/${realm}`;
  }

  private async token(): Promise<string> {
    if (this.cached && this.cached.expires_at > Date.now() + 5_000) {
      return this.cached.access_token;
    }

    const url = this.config.get<string>('app.keycloak.url')!;
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: this.config.get<string>('app.keycloak.adminUser')!,
      password: this.config.get<string>('app.keycloak.adminPassword')!,
    });

    const res = await axios.post(
      `${url}/realms/master/protocol/openid-connect/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    this.cached = {
      access_token: res.data.access_token,
      expires_at: Date.now() + res.data.expires_in * 1000,
    };
    return this.cached.access_token;
  }

  private authHeader(t: string) {
    return { Authorization: `Bearer ${t}` };
  }

  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role: string;
  }): Promise<string> {
    const t = await this.token();

    const createRes = await axios.post(
      `${this.baseUrl}/users`,
      {
        username: data.email,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        enabled: true,
        emailVerified: true,
        requiredActions: ['UPDATE_PASSWORD'],
        credentials: [{ type: 'password', value: data.password, temporary: true }],
      },
      { headers: this.authHeader(t) },
    );

    const location: string = createRes.headers['location'];
    if (!location) throw new InternalServerErrorException('Keycloak did not return a Location header');
    const keycloakSub = location.split('/').pop()!;

    let roleData: { id: string; name: string };
    try {
      const roleRes = await axios.get(`${this.baseUrl}/roles/${data.role}`, {
        headers: this.authHeader(t),
      });
      roleData = roleRes.data;
    } catch {
      await this.deleteUser(keycloakSub).catch(() => {});
      throw new InternalServerErrorException(`Keycloak role '${data.role}' not found in realm`);
    }

    await axios.post(
      `${this.baseUrl}/users/${keycloakSub}/role-mappings/realm`,
      [{ id: roleData.id, name: roleData.name }],
      { headers: this.authHeader(t) },
    );

    return keycloakSub;
  }

  async deleteUser(keycloakSub: string): Promise<void> {
    const t = await this.token();
    await axios.delete(`${this.baseUrl}/users/${keycloakSub}`, {
      headers: this.authHeader(t),
    });
  }
}
