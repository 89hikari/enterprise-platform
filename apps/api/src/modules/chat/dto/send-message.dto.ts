import { IsEnum, IsInt, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsEnum(['text', 'voice', 'video', 'file', 'image'])
  messageType!: 'text' | 'voice' | 'video' | 'file' | 'image';

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  fileSize?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  durationSeconds?: number;

  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;
}
