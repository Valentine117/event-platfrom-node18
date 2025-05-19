db = db.getSiblingDB('event-reward-platform-dev');
db.createCollection('sample_collection');

// 1일 출석 이벤트
const event1 = {
  code: 'ATT_101',
  name: '1일 출석 이벤트',
  description: '하루 1회 로그인 시 출석 보상',
  status: 'ACTIVE',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  eventType: 'LOGIN',
  streak: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const event1Result = db.rewardevents.insertOne(event1);
db.rewards.insertOne({
  name: '출석 포인트 1000',
  type: 'POINT',
  quantity: 1000,
  eventId: event1Result.insertedId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// 이스터 에그 이벤트
const event2 = {
  code: 'ATT_102',
  name: '이스터 에그 이벤트',
  description: '하루 로그인 5회 시 보상 지급!',
  status: 'ACTIVE',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  eventType: 'LOGIN',
  streak: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const event2Result = db.rewardevents.insertOne(event2);
db.rewards.insertOne({
  name: '이스터 에그 포인트 100',
  type: 'POINT',
  quantity: 100,
  eventId: event2Result.insertedId,
  createdAt: new Date(),
  updatedAt: new Date(),
});
