import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RewardEvent,
  RewardEventDocument,
  Reward,
  RewardDocument,
  RewardRequest,
  RewardRequestDocument,
  RewardRequestStatus,
} from '@lib/common';

@Injectable()
export class RewardGrantService {
  constructor(
    @InjectModel(RewardEvent.name)
    private rewardEventModel: Model<RewardEventDocument>,
    @InjectModel(Reward.name)
    private rewardModel: Model<RewardDocument>,
    @InjectModel(RewardRequest.name)
    private rewardRequestModel: Model<RewardRequestDocument>,
  ) {}

  async tryGrantReward({
    userId,
    eventCode,
    date,
  }: {
    userId: string;
    eventCode: string;
    date: string;
  }) {
    const event = await this.rewardEventModel.findOne({ code: eventCode });
    if (!event) return null;

    const reward = await this.rewardModel.findOne({ eventId: event._id });
    if (!reward) return null;

    const alreadyGiven = await this.rewardRequestModel.exists({
      userId: new Types.ObjectId(userId),
      eventId: event._id,
      rewardId: reward._id,
    });
    if (alreadyGiven) return null;

    const result = await this.rewardRequestModel.create({
      userId: new Types.ObjectId(userId),
      eventId: event._id,
      rewardId: reward._id,
      status: RewardRequestStatus.SUCCESS,
    });

    return result;
  }
}
