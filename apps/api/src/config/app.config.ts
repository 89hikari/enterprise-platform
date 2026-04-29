import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '3001', 10),
  appUrl: process.env.APP_URL || 'http://localhost',

  database: {
    url: process.env.DATABASE_URL!,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  keycloak: {
    url: process.env.KEYCLOAK_URL!,
    realm: process.env.KEYCLOAK_REALM!,
    clientId: process.env.KEYCLOAK_CLIENT_ID!,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
    jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
    adminUser: process.env.KEYCLOAK_ADMIN!,
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD!,
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSsl: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ROOT_USER!,
    secretKey: process.env.MINIO_ROOT_PASSWORD!,
    buckets: {
      avatars: process.env.MINIO_BUCKET_AVATARS || 'avatars',
      chat: process.env.MINIO_BUCKET_CHAT || 'chat-media',
      kanban: process.env.MINIO_BUCKET_KANBAN || 'kanban-attachments',
    },
  },

  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    tenantId: process.env.MICROSOFT_TENANT_ID || '',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || '',
    encryptionKey: process.env.MICROSOFT_ENCRYPTION_KEY || '',
  },
}));
