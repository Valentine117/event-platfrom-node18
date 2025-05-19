import { Test, TestingModule } from '@nestjs/testing';
import { LoginAttendanceConsumer } from './login-attendance.consumer';
import { RewardGrantService } from './reward-grant.service';
import { RewardEventCode } from '@lib/common';

// Redis 클라이언트 모킹 객체
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
};

// 보상 지급 서비스 모킹
const mockRewardGrantService = {
  tryGrantReward: jest.fn(),
};

describe('LoginAttendanceConsumer', () => {
  let consumer: LoginAttendanceConsumer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginAttendanceConsumer,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
        {
          provide: RewardGrantService,
          useValue: mockRewardGrantService,
        },
      ],
    }).compile();

    consumer = module.get<LoginAttendanceConsumer>(LoginAttendanceConsumer);
    jest.clearAllMocks();
  });

  it('출석이 처음이면 출석 처리하고 보상 지급', async () => {
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.incr.mockResolvedValue(1);

    await consumer.handleLoginEvent({ userId: 'user123' });

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      expect.stringMatching(/^attendance:user123:/),
      '1',
      { EX: 86400 },
    );
    expect(mockRewardGrantService.tryGrantReward).toHaveBeenCalledWith({
      userId: 'user123',
      eventCode: RewardEventCode.DAILY_ATTENDANCE,
      date: expect.any(String),
    });
  });

  it('출석이 이미 되었으면 보상 지급하지 않음', async () => {
    mockRedisClient.get.mockResolvedValue('1');
    mockRedisClient.incr.mockResolvedValue(2);

    await consumer.handleLoginEvent({ userId: 'user123' });

    expect(mockRewardGrantService.tryGrantReward).not.toHaveBeenCalledWith({
      userId: 'user123',
      eventCode: RewardEventCode.DAILY_ATTENDANCE,
      date: expect.any(String),
    });
  });

  it('5번째 로그인 시 이스터에그 보상 지급', async () => {
    mockRedisClient.get.mockResolvedValue('1');
    mockRedisClient.incr.mockResolvedValue(5);

    await consumer.handleLoginEvent({ userId: 'user123' });

    expect(mockRewardGrantService.tryGrantReward).toHaveBeenCalledWith({
      userId: 'user123',
      eventCode: RewardEventCode.LOGIN_5_TIMES,
      date: expect.any(String),
    });
  });

  it('5회 미만 로그인 시 이스터에그 보상 지급하지 않음', async () => {
    mockRedisClient.get.mockResolvedValue('1');
    mockRedisClient.incr.mockResolvedValue(3);

    await consumer.handleLoginEvent({ userId: 'user123' });

    expect(mockRewardGrantService.tryGrantReward).not.toHaveBeenCalledWith({
      userId: 'user123',
      eventCode: RewardEventCode.LOGIN_5_TIMES,
      date: expect.any(String),
    });
  });
});
