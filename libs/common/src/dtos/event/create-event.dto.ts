import {
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@lib/common/enums/event-status.enum';

export class CreateEventDto {
  @ApiProperty({ example: '테스트 이벤트', description: '이벤트 이름' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '특정 조건 발동 시 보상을 지급하는 이벤트' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'TES_001', description: '이벤트 코드' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: '2025-05-01T00:00:00.000Z' })
  @IsDateString()
  startDate: Date;

  @ApiProperty({ example: '2025-06-30T23:59:59.000Z' })
  @IsDateString()
  endDate: Date;

  @ApiProperty({ example: { loginStreak: 5 }, description: '조건 객체' })
  @IsObject()
  @IsNotEmpty()
  conditions: Record<string, any>;

  @ApiProperty({ enum: EventStatus, default: EventStatus.ACTIVE })
  @IsEnum(EventStatus)
  status: EventStatus;
}
