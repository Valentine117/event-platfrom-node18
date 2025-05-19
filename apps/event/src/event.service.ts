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
  UpdateEventDto,
  RewardRequestStatus,
} from '@lib/common';
import { Model, Types } from 'mongoose';

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
      return await this.eventModel.find().populate('rewards').exec();
    } catch {
      throw new InternalServerErrorException(
        '이벤트 목록 조회 중 오류가 발생했습니다.',
      );
    }
  }

  async updateEvent(eventId: string, dto: UpdateEventDto) {
    try {
      const updated = await this.eventModel.findByIdAndUpdate(
        new Types.ObjectId(eventId),
        { $set: dto },
        { new: true, runValidators: true },
      );

      if (!updated) {
        throw new NotFoundException('해당 이벤트를 찾을 수 없습니다.');
      }

      return updated;
    } catch (error) {
      // 잘못된 ObjectId 포맷
      if (error.name === 'CastError') {
        throw new NotFoundException('이벤트 ID 형식이 올바르지 않습니다.');
      }

      // 유효성 검사 실패 (예: DTO 제약 조건 위반)
      if (error.name === 'ValidationError') {
        throw new ConflictException('이벤트 수정값이 유효하지 않습니다.');
      }

      // 기타 예외
      throw new InternalServerErrorException(
        '이벤트 수정 중 서버 오류가 발생했습니다.',
      );
    }
  }

  async createReward(eventId: string, dto: CreateRewardDto) {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');

    try {
      return await this.rewardModel.create({
        ...dto,
        eventId: new Types.ObjectId(eventId),
      });
    } catch {
      throw new InternalServerErrorException(
        '보상 생성 중 오류가 발생했습니다.',
      );
    }
  }

  async requestReward(eventId: string, userId: string, dto: RequestRewardDto) {
    const rewardEvent = await this.eventModel.findById(eventId);
    if (!rewardEvent) {
      throw new NotFoundException('이벤트를 찾을 수 없습니다.');
    }

    const reward = await this.rewardModel.findOne({
      _id: new Types.ObjectId(dto.rewardId),
      eventId: new Types.ObjectId(eventId),
    });
    if (!reward) {
      throw new NotFoundException('해당 보상을 찾을 수 없습니다.');
    }

    const now = new Date();
    const isInPeriod =
      now >= rewardEvent.startDate && now <= rewardEvent.endDate;
    const isActive = rewardEvent.status === 'ACTIVE';

    const alreadyRequested = await this.requestModel.findOne({
      eventId: new Types.ObjectId(eventId),
      userId: new Types.ObjectId(userId),
    });

    const status =
      alreadyRequested || !isInPeriod || !isActive
        ? RewardRequestStatus.FAILED
        : RewardRequestStatus.SUCCESS;

    const request = new this.requestModel({
      eventId: new Types.ObjectId(eventId),
      userId: new Types.ObjectId(userId),
      rewardId: new Types.ObjectId(dto.rewardId),
      status,
    });

    try {
      return await request.save();
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
        .find({ userId: new Types.ObjectId(userId) })
        .populate('rewardId eventId');
    } catch {
      throw new InternalServerErrorException(
        '내 요청 목록 조회 중 오류가 발생했습니다.',
      );
    }
  }
}
