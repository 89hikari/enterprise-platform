import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  timeControl!: number | null;
}
