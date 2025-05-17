import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
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
    try {
      return await this.eventModel.create(dto);
    } catch {
      throw new InternalServerErrorException(
        '이벤트 생성 중 오류가 발생했습니다.',
      );
    }
  }

  async getEvents() {
    try {
      return await this.eventModel.find().exec();
    } catch {
      throw new InternalServerErrorException(
        '이벤트 목록 조회 중 오류가 발생했습니다.',
      );
    }
  }

  async createReward(eventId: string, dto: CreateRewardDto) {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');

    try {
      return await this.rewardModel.create({ ...dto, eventId });
    } catch {
      throw new InternalServerErrorException(
        '보상 생성 중 오류가 발생했습니다.',
      );
    }
  }

  async requestReward(eventId: string, userId: string, dto: RequestRewardDto) {
    const exists = await this.requestModel.findOne({ eventId, userId });
    if (exists) {
      throw new ConflictException('이미 요청한 이벤트입니다.');
    }

    const reward = await this.rewardModel.findOne({
      _id: dto.rewardId,
      eventId,
    });
    if (!reward) throw new NotFoundException('해당 보상을 찾을 수 없습니다.');

    const req = new this.requestModel({
      eventId,
      userId,
      rewardId: dto.rewardId,
      status: 'SUCCESS',
    });

    try {
      return await req.save();
    } catch {
      throw new InternalServerErrorException(
        '보상 요청 저장 중 오류가 발생했습니다.',
      );
    }
  }

  async getAllRequests() {
    try {
      return await this.requestModel.find().populate('rewardId eventId userId');
    } catch {
      throw new InternalServerErrorException(
        '요청 목록 조회 중 오류가 발생했습니다.',
      );
    }
  }

  async getRequestsByUser(userId: string) {
    try {
      return await this.requestModel
        .find({ userId })
        .populate('rewardId eventId');
    } catch {
      throw new InternalServerErrorException(
        '내 요청 목록 조회 중 오류가 발생했습니다.',
      );
    }
  }
}
