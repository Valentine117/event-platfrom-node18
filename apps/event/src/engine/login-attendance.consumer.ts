import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RedisClientType } from 'redis';
import { RewardEventCode } from '@lib/common';
import { RewardGrantService } from './reward-grant.service';

@Controller()
export class LoginAttendanceConsumer {
  constructor(
    @Inject('REDIS_CLIENT') private redisClient: RedisClientType,
    private readonly rewardGrantService: RewardGrantService,
  ) {}

  @EventPattern('user.logged_in')
  async handleLoginEvent(@Payload() data: { userId: string }) {
    const userId = data.userId;
    const today = new Date().toISOString().slice(0, 10);

    // 출석 처리
    const attendanceKey = `attendance:${userId}:${today}`;
    const alreadyAttended = await this.redisClient.get(attendanceKey);

    if (!alreadyAttended) {
      await this.redisClient.set(attendanceKey, '1', { EX: 86400 });
      console.log(`출석 처리 완료: ${attendanceKey}`);

      // 보상 지급 (ATT_101)
      await this.rewardGrantService.tryGrantReward({
        userId,
        eventCode: RewardEventCode.DAILY_ATTENDANCE,
        date: today,
      });
    } else {
      console.log(`이미 출석 처리됨: ${attendanceKey}`);
    }

    // 로그인 횟수 증가
    const loginKey = `login-count:${userId}:${today}`;
    const loginCount = await this.redisClient.incr(loginKey);
    if (loginCount === 1) {
      await this.redisClient.expire(loginKey, 86400);
    }

    // 로그인 5회 달성 시 이스터에그 지급 (ATT_102)
    if (loginCount === 5) {
      await this.rewardGrantService.tryGrantReward({
        userId,
        eventCode: RewardEventCode.LOGIN_5_TIMES,
        date: today,
      });
    }
  }
}
