// login-attendance.consumer.spec.ts
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

// 보상 지급 서비스 모킹 객체
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

  it('✅ 첫 로그인 시 출석 보상을 지급한다', async () => {
    mockRedisClient.get.mockResolvedValue(null); // 출석 여부 없음
    mockRedisClient.incr.mockResolvedValue(1); // 로그인 카운트 증가

    await consumer.handleLoginEvent({ userId: 'user123' });

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'attendance:user123:' + expect.any(String),
      '1',
      { EX: 86400 },
    );
    expect(mockRewardGrantService.tryGrantReward).toHaveBeenCalledWith({
      userId: 'user123',
      eventCode: RewardEventCode.DAILY_ATTENDANCE,
      date: expect.any(String),
    });
  });

  it('🚫 이미 출석한 경우에는 출석 보상을 지급하지 않는다', async () => {
    mockRedisClient.get.mockResolvedValue('1'); // 이미 출석함
    mockRedisClient.incr.mockResolvedValue(2);

    await consumer.handleLoginEvent({ userId: 'user123' });

    expect(mockRewardGrantService.tryGrantReward).not.toHaveBeenCalledWith({
      userId: 'user123',
      eventCode: RewardEventCode.DAILY_ATTENDANCE,
      date: expect.any(String),
    });
  });

  it('🥚 로그인 5회째에는 이스터에그 보상을 지급한다', async () => {
    mockRedisClient.get.mockResolvedValue('1'); // 이미 출석 처리됨
    mockRedisClient.incr.mockResolvedValue(5); // 5회 로그인 도달

    await consumer.handleLoginEvent({ userId: 'user123' });

    expect(mockRewardGrantService.tryGrantReward).toHaveBeenCalledWith({
      userId: 'user123',
      eventCode: RewardEventCode.LOGIN_5_TIMES,
      date: expect.any(String),
    });
  });

  it('🔁 로그인 5회 이전에는 이스터에그 보상을 지급하지 않는다', async () => {
    mockRedisClient.get.mockResolvedValue('1'); // 이미 출석 처리됨
    mockRedisClient.incr.mockResolvedValue(3); // 아직 5회 미만

    await consumer.handleLoginEvent({ userId: 'user123' });

    expect(mockRewardGrantService.tryGrantReward).not.toHaveBeenCalledWith({
      userId: 'user123',
      eventCode: RewardEventCode.LOGIN_5_TIMES,
      date: expect.any(String),
    });
  });
});
