import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { RewardGrantService } from './reward-grant.service';
import {
  Reward,
  RewardEvent,
  RewardRequest,
  RewardRequestStatus,
} from '@lib/common';

// 🧪 가짜 Mongoose 모델 정의 (테스트 전용)
const mockRewardEventModel = {
  findOne: jest.fn(),
};

const mockRewardModel = {
  findOne: jest.fn(),
};

const mockRewardRequestModel = {
  exists: jest.fn(),
  create: jest.fn(),
};

describe('RewardGrantService', () => {
  let service: RewardGrantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardGrantService,
        {
          provide: getModelToken(RewardEvent.name),
          useValue: mockRewardEventModel,
        },
        {
          provide: getModelToken(Reward.name),
          useValue: mockRewardModel,
        },
        {
          provide: getModelToken(RewardRequest.name),
          useValue: mockRewardRequestModel,
        },
      ],
    }).compile();

    service = module.get<RewardGrantService>(RewardGrantService);
  });

  it('이벤트가 존재하지 않으면 null을 반환해야 한다', async () => {
    mockRewardEventModel.findOne.mockResolvedValue(null);

    const result = await service.tryGrantReward({
      userId: 'user1',
      eventCode: 'ATT_999',
      date: '2025-05-18',
    });

    expect(result).toBeNull(); // 이벤트 없음
  });

  it('보상이 존재하지 않으면 null을 반환해야 한다', async () => {
    mockRewardEventModel.findOne.mockResolvedValue({ _id: 'e1' });
    mockRewardModel.findOne.mockResolvedValue(null);

    const result = await service.tryGrantReward({
      userId: 'user1',
      eventCode: 'ATT_101',
      date: '2025-05-18',
    });

    expect(result).toBeNull(); // 보상 없음
  });

  it('이미 보상을 지급한 경우 null을 반환해야 한다', async () => {
    mockRewardEventModel.findOne.mockResolvedValue({ _id: 'e1' });
    mockRewardModel.findOne.mockResolvedValue({ _id: 'r1' });
    mockRewardRequestModel.exists.mockResolvedValue(true);

    const result = await service.tryGrantReward({
      userId: 'user1',
      eventCode: 'ATT_101',
      date: '2025-05-18',
    });

    expect(result).toBeNull(); // 중복 보상 방지
  });

  it('조건을 모두 만족하면 보상 요청을 생성하고 반환해야 한다', async () => {
    const mockRewardRequest = { _id: 'rr1' };

    mockRewardEventModel.findOne.mockResolvedValue({ _id: 'e1' });
    mockRewardModel.findOne.mockResolvedValue({ _id: 'r1' });
    mockRewardRequestModel.exists.mockResolvedValue(false);
    mockRewardRequestModel.create.mockResolvedValue(mockRewardRequest);

    const result = await service.tryGrantReward({
      userId: 'user1',
      eventCode: 'ATT_101',
      date: '2025-05-18',
    });

    expect(result).toEqual(mockRewardRequest); // 정상 보상 지급
    expect(mockRewardRequestModel.create).toBeCalledWith({
      userId: 'user1',
      eventId: 'e1',
      rewardId: 'r1',
      date: '2025-05-18',
      status: RewardRequestStatus.SUCCESS,
    });
  });
});
