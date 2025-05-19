import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { RewardGrantService } from './reward-grant.service';
import {
  Reward,
  RewardEvent,
  RewardRequest,
  RewardRequestStatus,
} from '@lib/common';
import { Types } from 'mongoose';

const userId = '507f1f77bcf86cd799439011';
const eventId = '507f191e810c19729de860ea';
const rewardId = '507f1f77bcf86cd799439012';
const rewardRequestId = '507f1f77bcf86cd799439013';

// Mongoose 모델 모킹
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
    jest.clearAllMocks(); // 각 테스트마다 mock 초기화
  });

  it('이벤트가 존재하지 않으면 null 반환', async () => {
    mockRewardEventModel.findOne.mockResolvedValue(null);

    const result = await service.tryGrantReward({
      userId,
      eventCode: 'ATT_101',
      date: '2025-05-20',
    });

    expect(result).toBeNull();
  });

  it('보상이 존재하지 않으면 null 반환', async () => {
    mockRewardEventModel.findOne.mockResolvedValue({
      _id: new Types.ObjectId(eventId),
    });
    mockRewardModel.findOne.mockResolvedValue(null);

    const result = await service.tryGrantReward({
      userId,
      eventCode: 'ATT_101',
      date: '2025-05-20',
    });

    expect(result).toBeNull();
  });

  it('이미 보상이 지급된 경우 null 반환', async () => {
    mockRewardEventModel.findOne.mockResolvedValue({
      _id: new Types.ObjectId(eventId),
    });
    mockRewardModel.findOne.mockResolvedValue({
      _id: new Types.ObjectId(rewardId),
    });
    mockRewardRequestModel.exists.mockResolvedValue(true);

    const result = await service.tryGrantReward({
      userId,
      eventCode: 'ATT_101',
      date: '2025-05-20',
    });

    expect(result).toBeNull();
  });

  it('보상이 지급되지 않았을 경우 생성 후 반환', async () => {
    const mockRewardRequest = { _id: new Types.ObjectId(rewardRequestId) };

    mockRewardEventModel.findOne.mockResolvedValue({
      _id: new Types.ObjectId(eventId),
    });
    mockRewardModel.findOne.mockResolvedValue({
      _id: new Types.ObjectId(rewardId),
    });
    mockRewardRequestModel.exists.mockResolvedValue(false);
    mockRewardRequestModel.create.mockResolvedValue(mockRewardRequest);

    const result = await service.tryGrantReward({
      userId,
      eventCode: 'ATT_101',
      date: '2025-05-20',
    });

    expect(mockRewardRequestModel.create).toHaveBeenCalledWith({
      userId: new Types.ObjectId(userId),
      eventId: new Types.ObjectId(eventId),
      rewardId: new Types.ObjectId(rewardId),
      status: RewardRequestStatus.SUCCESS,
    });
    expect(result).toEqual(mockRewardRequest);
  });
});
