import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UserRole } from '@enterprise/shared';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  address?: {
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  };

  @IsOptional()
  @IsString()
  @MaxLength(255)
  positionName?: string;

  @IsEnum(['superadmin', 'admin', 'manager', 'hr_manager', 'employee'])
  role!: UserRole;

  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
