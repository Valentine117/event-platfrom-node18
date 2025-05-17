import {
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ example: '출석 이벤트', description: '이벤트 이름' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '매일 출석 시 포인트 지급' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2025-06-01T00:00:00.000Z' })
  @IsDateString()
  startDate: Date;

  @ApiProperty({ example: '2025-06-30T23:59:59.000Z' })
  @IsDateString()
  endDate: Date;

  @ApiProperty({ example: { loginStreak: 5 }, description: '조건 객체' })
  @IsObject()
  @IsNotEmpty()
  conditions: Record<string, any>;
}
