import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../schemas/user.schema';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: '사용자 이메일' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'securePass123',
    minLength: 6,
    description: '비밀번호',
  })
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.USER,
    description: '역할 (USER | OPERATOR | ADMIN 등)',
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
