import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  RewardEvent,
  RewardEventDocument,
  Reward,
  RewardDocument,
  RewardRequest,
  RewardRequestDocument,
  CreateEventDto,
  CreateRewardDto,
  RequestRewardDto,
} from '@lib/common';
import { Model } from 'mongoose';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(RewardEvent.name)
    private readonly eventModel: Model<RewardEventDocument>,
    @InjectModel(Reward.name)
    private readonly rewardModel: Model<RewardDocument>,
    @InjectModel(RewardRequest.name)
    private readonly requestModel: Model<RewardRequestDocument>,
  ) {}

  async createEvent(dto: CreateEventDto) {
    return this.eventModel.create(dto);
  }

  async getEvents() {
    return this.eventModel.find().exec();
  }

  async createReward(eventId: string, dto: CreateRewardDto) {
    return this.rewardModel.create({ ...dto, eventId });
  }

  async requestReward(eventId: string, userId: string, dto: RequestRewardDto) {
    const exists = await this.requestModel.findOne({ eventId, userId });
    if (exists) throw new Error('Already requested');

    const reward = await this.rewardModel.findOne({
      _id: dto.rewardId,
      eventId,
    });
    if (!reward) throw new Error('Reward not found');

    const req = new this.requestModel({
      eventId,
      userId,
      rewardId: dto.rewardId,
      status: 'SUCCESS',
    });

    return req.save();
  }

  async getAllRequests() {
    return this.requestModel.find().populate('rewardId eventId userId');
  }

  async getRequestsByUser(userId: string) {
    return this.requestModel.find({ userId }).populate('rewardId eventId');
  }
}
