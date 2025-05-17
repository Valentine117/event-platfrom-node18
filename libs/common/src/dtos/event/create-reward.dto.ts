import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRewardDto {
  @ApiProperty({ example: '500포인트', description: '보상 이름' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'POINT',
    enum: ['POINT', 'ITEM', 'COUPON'],
    description: '보상 유형',
  })
  @IsString()
  @IsIn(['POINT', 'ITEM', 'COUPON'])
  type: 'POINT' | 'ITEM' | 'COUPON';

  @ApiProperty({ example: 100, description: '수량' })
  @IsNumber()
  quantity: number;
}
