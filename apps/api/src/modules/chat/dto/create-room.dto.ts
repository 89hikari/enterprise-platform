import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateRoomDto {
  @IsEnum(['direct', 'group'])
  type!: 'direct' | 'group';

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  memberIds!: string[];
}
