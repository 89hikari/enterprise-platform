import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class FilesService {
  private s3: S3Client;
  private endpoint: string;

  constructor(private config: ConfigService) {
    const minio = this.config.get('app.minio');
    const protocol = minio.useSsl ? 'https' : 'http';
    this.endpoint = `${protocol}://${minio.endpoint}:${minio.port}`;

    this.s3 = new S3Client({
      endpoint: this.endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: minio.accessKey,
        secretAccessKey: minio.secretKey,
      },
      forcePathStyle: true,
    });
  }

  getBucketName(bucketKey: 'avatars' | 'chat' | 'kanban'): string {
    const buckets = this.config.get('app.minio.buckets');
    return buckets[bucketKey];
  }

  async getPresignedUploadUrl(
    bucketKey: 'avatars' | 'chat' | 'kanban',
    key: string,
    contentType: string,
    expiresIn = 300,
  ): Promise<string> {
    const bucket = this.getBucketName(bucketKey);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async getPresignedDownloadUrl(
    bucketKey: 'avatars' | 'chat' | 'kanban',
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    const bucket = this.getBucketName(bucketKey);
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }
}
