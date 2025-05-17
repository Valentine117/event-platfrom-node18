import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { RewardGrantService } from './reward-grant.service';
import {
  Reward,
  RewardEvent,
  RewardRequest,
  RewardRequestStatus,
} from '@lib/common';

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

  it('should return null if event not found', async () => {
    mockRewardEventModel.findOne.mockResolvedValue(null);

    const result = await service.tryGrantReward({
      userId: 'user1',
      eventCode: 'ATT_999',
      date: '2025-05-18',
    });

    expect(result).toBeNull();
  });

  it('should return null if reward not found', async () => {
    mockRewardEventModel.findOne.mockResolvedValue({ _id: 'e1' });
    mockRewardModel.findOne.mockResolvedValue(null);

    const result = await service.tryGrantReward({
      userId: 'user1',
      eventCode: 'ATT_101',
      date: '2025-05-18',
    });

    expect(result).toBeNull();
  });

  it('should return null if already given', async () => {
    mockRewardEventModel.findOne.mockResolvedValue({ _id: 'e1' });
    mockRewardModel.findOne.mockResolvedValue({ _id: 'r1' });
    mockRewardRequestModel.exists.mockResolvedValue(true);

    const result = await service.tryGrantReward({
      userId: 'user1',
      eventCode: 'ATT_101',
      date: '2025-05-18',
    });

    expect(result).toBeNull();
  });

  it('should create and return reward request if all conditions met', async () => {
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

    expect(result).toEqual(mockRewardRequest);
    expect(mockRewardRequestModel.create).toBeCalledWith({
      userId: 'user1',
      eventId: 'e1',
      rewardId: 'r1',
      date: '2025-05-18',
      status: RewardRequestStatus.SUCCESS,
    });
  });
});
