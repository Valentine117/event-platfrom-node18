export class CreateRewardDto {
  name: string;
  type: 'POINT' | 'ITEM' | 'COUPON';
  quantity: number;
}
