import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { RewardEvent, RewardEventSchema } from './schemas/reward-event.schema';
import { Reward, RewardSchema } from './schemas/reward.schema';
import {
  RewardRequest,
  RewardRequestSchema,
} from './schemas/reward-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RewardEvent.name, schema: RewardEventSchema },
      { name: Reward.name, schema: RewardSchema },
      { name: RewardRequest.name, schema: RewardRequestSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class CommonModule {}
