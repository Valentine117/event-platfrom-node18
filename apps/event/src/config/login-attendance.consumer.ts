import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RedisClientType } from 'redis';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Reward,
  RewardDocument,
  RewardEvent,
  RewardEventCode,
  RewardEventDocument,
  RewardRequest,
  RewardRequestDocument,
  RewardRequestStatus,
} from '@lib/common';

@Controller()
export class LoginAttendanceConsumer {
  constructor(
    @Inject('REDIS_CLIENT') private redisClient: RedisClientType,
    @InjectModel(RewardEvent.name)
    private rewardEventModel: Model<RewardEventDocument>,
    @InjectModel(Reward.name) private rewardModel: Model<RewardDocument>,
    @InjectModel(RewardRequest.name)
    private rewardRequestModel: Model<RewardRequestDocument>,
  ) {}

  @EventPattern('user.logged_in')
  async handleLoginEvent(@Payload() data: { userId: string }) {
    const userId = data.userId;
    const today = new Date().toISOString().slice(0, 10);
    const redisKey = `attendance:${userId}:${today}`;

    const exists = await this.redisClient.get(redisKey);
    if (exists) {
      console.log(`이미 출석 처리됨: ${redisKey}`);
      return;
    }

    // 1. 출석 저장
    await this.redisClient.set(redisKey, '1', { EX: 86400 });
    console.log(`출석 처리 완료: ${redisKey}`);

    // 2. 이벤트 조회 (ATT_101)
    const event = await this.rewardEventModel.findOne({
      code: RewardEventCode.DAILY_ATTENDANCE,
    });
    if (!event) {
      console.warn(
        `이벤트 코드 ${RewardEventCode.DAILY_ATTENDANCE} 가 존재하지 않음`,
      );
      return;
    }

    // 3. 보상 조회
    const reward = await this.rewardModel.findOne({ eventId: event._id });
    if (!reward) {
      console.warn(`이벤트 ${event._id}에 대한 보상이 없음`);
      return;
    }

    // 4. 보상 지급 이력 생성
    await this.rewardRequestModel.create({
      userId,
      eventId: event._id,
      rewardId: reward._id,
      status: RewardRequestStatus.SUCCESS,
    });

    console.log(
      `보상 지급 완료: ${reward.quantity} ${reward.type} for ${userId}`,
    );
  }
}
