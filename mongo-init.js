db = db.getSiblingDB('event-reward-platform-dev');

db.createCollection('sample_collection');

// 1. RewardEvent 생성
const event = {
  code: 'ATT_101',
  name: '1일 출석 이벤트',
  description: '하루 1회 로그인 시 출석 보상',
  status: 'ACTIVE',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  conditions: {
    type: 'login_1day',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const eventResult = db.rewardevents.insertOne(event);

// 2. Reward 생성 (eventId 참조)
const reward = {
  name: '출석 포인트 1000',
  type: 'POINT',
  quantity: 1000,
  eventId: eventResult.insertedId,
  createdAt: new Date(),
  updatedAt: new Date(),
};

db.rewards.insertOne(reward);

print('✅ 출석 이벤트(ATT_101) 및 보상 데이터 초기화 완료');
