import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateRewardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(['POINT', 'ITEM', 'COUPON'])
  type: 'POINT' | 'ITEM' | 'COUPON';

  @IsNumber()
  quantity: number;
}
