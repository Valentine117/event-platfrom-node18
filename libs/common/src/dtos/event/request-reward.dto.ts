import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestRewardDto {
  @ApiProperty({
    example: 'REWARD_ID',
    description: '보상 ID (Mongo ObjectId)',
  })
  @IsString()
  @IsNotEmpty()
  rewardId: string;
}
