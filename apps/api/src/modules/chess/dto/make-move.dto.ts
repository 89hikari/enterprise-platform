import { IsString, IsOptional, Length } from 'class-validator';

export class MakeMoveDto {
  @IsString()
  roomId: string;

  @IsString()
  @Length(2, 2)
  from: string;

  @IsString()
  @Length(2, 2)
  to: string;

  @IsOptional()
  @IsString()
  @Length(1, 1)
  promotion?: string;
}
