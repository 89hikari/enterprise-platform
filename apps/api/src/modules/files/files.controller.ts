import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Post('presign/upload')
  async getUploadUrl(
    @Body() body: { bucket: 'avatars' | 'chat' | 'kanban'; fileName: string; contentType: string },
  ) {
    const key = `${Date.now()}-${body.fileName}`;
    const url = await this.files.getPresignedUploadUrl(body.bucket, key, body.contentType);
    return { uploadUrl: url, key };
  }

  @Get('presign/download/:bucket/:key')
  async getDownloadUrl(
    @Param('bucket') bucket: 'avatars' | 'chat' | 'kanban',
    @Param('key') key: string,
  ) {
    const url = await this.files.getPresignedDownloadUrl(bucket, key);
    return { downloadUrl: url };
  }
}
