import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestRewardDto {
  @ApiProperty({
    example: '6647a1c9f8f9de0012345678',
    description: '보상 ID (Mongo ObjectId)',
  })
  @IsString()
  @IsNotEmpty()
  rewardId: string;
}
