import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@lib/common/enums/event-status.enum';
import { EventType } from '@lib/common/enums/event-type.enum';

export class CreateEventDto {
  @ApiProperty({ example: '테스트 이벤트', description: '이벤트 이름' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '이벤트 설명' })
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

  @ApiProperty({ enum: EventType, example: EventType.LOGIN })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ example: 5, description: '지속 일수 또는 횟수 (1 이상)' })
  @IsNumber()
  @Min(1)
  streak: number;

  @ApiProperty({ enum: EventStatus, default: EventStatus.INACTIVE })
  @IsEnum(EventStatus)
  status: EventStatus;
}
