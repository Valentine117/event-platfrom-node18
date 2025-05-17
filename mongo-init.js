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

// ATT_102 (5회 로그인 이스터에그 이벤트)
const eggEvent = {
  code: 'ATT_102',
  name: '이스터 에그 이벤트',
  description: '하루 로그인 5회 시 보상 지급!',
  status: 'ACTIVE',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  conditions: {
    type: 'login_count',
    threshold: 5,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const eggResult = db.rewardevents.insertOne(eggEvent);

db.rewards.insertOne({
  name: '이스터 에그 포인트 100',
  type: 'POINT',
  quantity: 100,
  eventId: eggResult.insertedId,
  createdAt: new Date(),
  updatedAt: new Date(),
});
