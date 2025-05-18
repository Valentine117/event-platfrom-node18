# MSA 기반 이벤트/보상 플랫폼

## 프로젝트 개요
이 **이벤트/보상 플랫폼**은 유저의 특정 행동(예: 출석, 로그인 횟수)을 자동으로 감지하여 보상을 지급하는 시스템입니다. NestJS, MongoDB, Redis, RabbitMQ로 구성되며, `docker-compose up --build` 명령어로 쉽게 실행할 수 있습니다.

## 기술 스택
- **NestJS Monorepo (MSA)**: Gateway, Auth, Event 서비스가 독립된 모듈로 동작하는 마이크로서비스 아키텍처(MSA)를 채택했습니다. Monorepo는 `@lib/common` 공용 도메인을 통해 타입, DTO, 스키마를 일관되게 관리하여 코드 중복을 최소화합니다.
- **MongoDB**: 이벤트, 보상, 요청 데이터를 저장.
- **Redis**: TTL 기반 출석 체크 및 로그인 횟수 관리.
- **RabbitMQ**: 비동기 이벤트 처리(예: 로그인 이벤트).
- **Swagger**: API 문서 자동 생성.
- **HTTPS + 고정 IP**: Gateway는 인증서를 통해 HTTPS를 지원하며, 고정 IP로 화이트리스트 통신을 구현.

## 서버 아키텍처
- **Gateway**: 모든 API 요청의 진입점, 인증, 권한 검사, 라우팅.
- **Auth**: 유저 관리, 로그인, 역할 관리, JWT 발급.
- **Event**: 이벤트 생성, 보상 정의, 요청 처리, 지급 상태 저장.

## Swagger 경로
- `https://localhost:3000/apis`: Gateway의 API 문서.

## API 목록
### 🔐 Auth
- `POST /auth/register`: 회원가입.
- `POST /auth/login`: 로그인(JWT 발급).

### ✅ Health
- `GET /health`: 서버, DB, RabbitMQ, Redis 상태 점검.

### 🗓️ Event (운영자/유저 공용)
- `POST /event`: 이벤트 생성(운영자).
- `GET /event`: 이벤트 목록 조회(공용).
- `POST /event/{eventId}/rewards`: 보상 등록(운영자).
- `POST /event/{eventId}/request`: 보상 요청(유저).
- `GET /event/requests`: 전체 요청 이력 조회(감사자/관리자).
- `GET /event/requests/me`: 내 요청 이력 조회(유저).

## 설계 의도 및 구조 선택 이유
### 1. 이벤트 설계
- 이벤트는 `RewardEvent` 클래스로 정의되며, 고유 `code`로 관리(예: `ATT_101` - 1일 출석, `ATT_102` - 5회 로그인).
- `Event` 대신 `RewardEvent`를 사용해 NestJS 내장 객체와의 충돌 방지.
- 조건(`conditions`)은 JSON 객체로 유연성 확보.

### 2. 조건 검증
- 로그인 시 RabbitMQ로 메시지 발행, 이벤트 서버에서 Redis로 조건 검증.
  - 출석: `attendance:{userId}:{yyyy-mm-dd}` 키로 1일 1회 기록.
  - 로그인 횟수: `login-count:{userId}:{yyyy-mm-dd}` 키를 `incr()`로 증가, TTL 적용.

### 3. 보상 처리
- 보상은 `Reward` 엔티티로 관리, 이벤트와 1:N 관계.
- 보상 요청 시 `RewardRequest` 생성으로 중복 지급 방지.
- 중복 판단 기준: `(userId, eventId, rewardId, date)`.

### 4. API 흐름
- **Gateway**: JWT 토큰 검증 및 역할 기반 권한 검사.
- **Auth**: `Client → Gateway → Auth → Gateway → Client`로 회원가입/로그인 처리, JWT 반환.
- **Event**: `Client → Gateway → Event → Gateway → Client`로 이벤트/보상 처리.
- `docker-compose up --build` 시 `mongo-init.js`로 초기 이벤트 및 보상 등록.
- 로그인 성공 시 Gateway가 `userId`를 RabbitMQ로 발행, 이벤트 서버는 Redis로 조건 검증 후 보상 지급.

## 테스트 방법
### 1. 프로젝트 실행
```bash
git clone <repository-url>
cd <repository-directory>
docker-compose up --build
```
- **주의**: Redis와 RabbitMQ 부팅이 느릴 수 있으므로, `https://localhost:3000/health`로 서비스 상태 확인 후 테스트 진행.
- 이벤트 서버는 Redis/RabbitMQ 미준비 시 헬스 체크 실패 가능.

### 2. 컨테이너 정리
```bash
docker-compose down -v --remove-orphans
```
- 반복 실행 시 `npm install` 디스크 공간 부족 에러 방지를 위해 볼륨 정리 권장.

### 3. Postman 테스트
- 루트 디렉토리의 `EVENT_PLATFORM_NODE18_TEST.postman_collection.json`을 Postman으로 가져와 테스트.
- 또는 `https://localhost:3000/apis`의 Swagger로 테스트 가능.

### 4. API 테스트 (사전 등록 이벤트 보상 흐름)
#### (1) 헬스 체크
```bash
docker-compose up --build
curl -k 'https://localhost:3000/health'
```
- 응답 (초기 RabbitMQ 부팅 지연으로 이벤트 상태 `fail` 가능):
```json
{
  "gateway": { "status": "ok" },
  "mongo": { "status": "ok", "durationMs": 0 },
  "redis": { "status": "ok", "durationMs": 2 },
  "rabbitmq": { "status": "ok", "durationMs": 3 },
  "auth": { "status": "ok", "durationMs": 16 },
  "event": { "status": "ok", "durationMs": 14 }
}
```

#### (2) 회원가입 및 로그인
```bash
# 회원가입 (OPERATOR, USER, ADMIN, AUDITOR 역할별 테스트)
curl -k 'https://localhost:3000/auth/register' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "operator@example.com",
  "password": "123456",
  "role": "OPERATOR"
}'
```
- 응답:
```json
{ "message": "가입 완료." }
```

```bash
# 로그인
curl -k 'https://localhost:3000/auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{"email":"operator@example.com", "password":"123456"}'
```
- 응답:
```json
{ "accessToken": "YOUR_TOKEN" }
```

#### (3) 이벤트 및 보상 확인
```bash
curl -k 'https://localhost:3000/event' \
--header 'Authorization: Bearer YOUR_TOKEN'
```
- 응답 (`mongo-init.js`로 등록된 데이터):
```json
[
  {
    "_id": "68299a7cbefb350b7a65d0fb",
    "code": "ATT_101",
    "name": "1일 출석 이벤트",
    "description": "하루 1회 로그인 시 출석 보상",
    "status": "ACTIVE",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T00:00:00.000Z",
    "conditions": { "type": "login_1day" },
    "createdAt": "2025-05-18T08:29:48.890Z",
    "updatedAt": "2025-05-18T08:29:48.890Z",
    "rewards": [
      {
        "_id": "68299a7cbefb350b7a65d0fc",
        "name": "출석 포인트 1000",
        "type": "POINT",
        "quantity": 1000,
        "eventId": "68299a7cbefb350b7a65d0fb",
        "createdAt": "2025-05-18T08:29:48.899Z",
        "updatedAt": "2025-05-18T08:29:48.899Z"
      }
    ],
    "id": "68299a7cbefb350b7a65d0fb"
  },
  {
    "_id": "68299a7cbefb350b7a65d0fd",
    "code": "ATT_102",
    "name": "이스터 에그 이벤트",
    "description": "하루 로그인 5회 시 보상 지급!",
    "status": "ACTIVE",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T00:00:00.000Z",
    "conditions": { "type": "login_count", "threshold": 5 },
    "createdAt": "2025-05-18T08:29:48.910Z",
    "updatedAt": "2025-05-18T08:29:48.910Z",
    "rewards": [
      {
        "_id": "68299a7cbefb350b7a65d0fe",
        "name": "이스터 에그 포인트 100",
        "type": "POINT",
        "quantity": 100,
        "eventId": "68299a7cbefb350b7a65d0fd",
        "createdAt": "2025-05-18T08:29:48.912Z",
        "updatedAt": "2025-05-18T08:29:48.912Z"
      }
    ],
    "id": "68299a7cbefb350b7a65d0fd"
  }
]
```

#### (4) 유저 보상 확인
```bash
# 유저 회원가입 및 로그인
curl -k 'https://localhost:3000/auth/register' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "user@example.com",
  "password": "123456",
  "role": "USER"
}'

curl -k 'https://localhost:3000/auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{"email":"user@example.com", "password":"123456"}'

# 보상 확인
curl -k 'https://localhost:3000/event/requests/me' \
--header 'Authorization: Bearer YOUR_TOKEN'
```
- 응답 (1회 로그인):
```json
[
  {
    "_id": "68299b59449876934c7e6b94",
    "userId": "68299b34fda07e59dae8d4ec",
    "eventId": {
      "_id": "68299a7cbefb350b7a65d0fb",
      "code": "ATT_101",
      "name": "1일 출석 이벤트",
      "description": "하루 1회 로그인 시 출석 보상",
      "status": "ACTIVE",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T00:00:00.000Z",
      "conditions": { "type": "login_1day" },
      "createdAt": "2025-05-18T08:29:48.890Z",
      "updatedAt": "2025-05-18T08:29:48.890Z",
      "id": "68299a7cbefb350b7a65d0fb"
    },
    "rewardId": {
      "_id": "68299a7cbefb350b7a65d0fc",
      "name": "출석 포인트 1000",
      "type": "POINT",
      "quantity": 1000,
      "eventId": "68299a7cbefb350b7a65d0fb",
      "createdAt": "2025-05-18T08:29:48.899Z",
      "updatedAt": "2025-05-18T08:29:48.899Z"
    },
    "status": "SUCCESS",
    "createdAt": "2025-05-18T08:33:29.822Z",
    "updatedAt": "2025-05-18T08:33:29.822Z",
    "__v": 0
  }
]
```

#### (5) 5회 로그인 후 보상 확인
```bash
# 로그인 5회 반복
curl -k 'https://localhost:3000/auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{"email":"user@example.com", "password":"123456"}'

# 보상 확인
curl -k 'https://localhost:3000/event/requests/me' \
--header 'Authorization: Bearer YOUR_TOKEN'
```
- 응답:
```json
[
  {
    "_id": "68299b59449876934c7e6b94",
    "userId": "68299b34fda07e59dae8d4ec",
    "eventId": {
      "_id": "68299a7cbefb350b7a65d0fb",
      "code": "ATT_101",
      "name": "1일 출석 이벤트",
      "description": "하루 1회 로그인 시 출석 보상",
      "status": "ACTIVE",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T00:00:00.000Z",
      "conditions": { "type": "login_1day" },
      "createdAt": "2025-05-18T08:29:48.890Z",
      "updatedAt": "2025-05-18T08:29:48.890Z",
      "id": "68299a7cbefb350b7a65d0fb"
    },
    "rewardId": {
      "_id": "68299a7cbefb350b7a65d0fc",
      "name": "출석 포인트 1000",
      "type": "POINT",
      "quantity": 1000,
      "eventId": "68299a7cbefb350b7a65d0fb",
      "createdAt": "2025-05-18T08:29:48.899Z",
      "updatedAt": "2025-05-18T08:29:48.899Z"
    },
    "status": "SUCCESS",
    "createdAt": "2025-05-18T08:33:29.822Z",
    "updatedAt": "2025-05-18T08:33:29.822Z",
    "__v": 0
  },
  {
    "_id": "68299c70449876934c7e6b9c",
    "userId": "68299b34fda07e59dae8d4ec",
    "eventId": {
      "_id": "68299a7cbefb350b7a65d0fd",
      "code": "ATT_102",
      "name": "이스터 에그 이벤트",
      "description": "하루 로그인 5회 시 보상 지급!",
      "status": "ACTIVE",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T00:00:00.000Z",
      "conditions": { "type": "login_count", "threshold": 5 },
      "createdAt": "2025-05-18T08:29:48.910Z",
      "updatedAt": "2025-05-18T08:29:48.910Z",
      "id": "68299a7cbefb350b7a65d0fd"
    },
    "rewardId": {
      "_id": "68299a7cbefb350b7a65d0fe",
      "name": "이스터 에그 포인트 100",
      "type": "POINT",
      "quantity": 100,
      "eventId": "68299a7cbefb350b7a65d0fd",
      "createdAt": "2025-05-18T08:29:48.912Z",
      "updatedAt": "2025-05-18T08:29:48.912Z"
    },
    "status": "SUCCESS",
    "createdAt": "2025-05-18T08:38:08.189Z",
    "updatedAt": "2025-05-18T08:38:08.189Z",
    "__v": 0
  }
]
```

#### (6) 역할별 추가 테스트
- 이벤트/보상 등록 및 요청은 `https://localhost:3000/apis` 또는 Postman으로 역할별 테스트 가능.

## 구현 중 고민과 선택
### 1. 출석 보상 중복 방지
- Redis TTL(86400초)로 출석 보상 중복 지급 방지.

### 2. RabbitMQ 안정성
- 메시지 발행 실패가 로그인 실패로 이어지지 않도록 `fire-and-forget` 방식 채택.

### 3. 공용 라이브러리
- `@lib/common`에 DTO, Enum, Schema, Guard 집중화로 코드 중복 감소 및 유지보수성 향상.

### 4. 로깅 및 예외 처리
- Gateway에 `LoggingInterceptor`, `AllExceptionsFilter`, `CustomLogger` 글로벌 등록.
```ts
// main.ts
app.useGlobalInterceptors(app.get(LoggingInterceptor));
app.useGlobalFilters(app.get(AllExceptionsFilter));
app.useLogger(app.get(CustomLogger));
```

### 5. 헬스 체크
- Gateway에서 Auth, Event, MongoDB, Redis, RabbitMQ 주기적 점검.
```ts
const authRes = await axios.get(`${authUrl}/health`);
const redisHealthy = await this.redisClient.ping();
```

### 6. DTO 유효성 검증
- DTO로 요청 데이터 검증, 잘못된 요청은 `BadRequest` 예외 처리.
```ts
export class RegisterDto {
  @IsEmail()
  email: string;

  @Length(6, 20)
  password: string;
}
```

### 7. 출석 체크 처리
- RabbitMQ와 Redis 기반, `RewardGrantService`로 보상 지급 로직 분리.
```ts
await this.rewardGrantService.tryGrantReward({
  userId,
  eventCode: RewardEventCode.DAILY_ATTENDANCE,
  date: today,
});
```

### 8. 화이트리스트 및 보안
- Gateway 고정 IP(`172.19.0.100`)로 화이트리스트 통신 설정.
```yaml
# docker-compose.yml
networks:
  app_net:
    ipv4_address: 172.19.0.100
```
```ts
// whitelist.middleware.ts
@Injectable()
export class IpWhitelistMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const remoteAddress = req.connection.remoteAddress;
    if (!remoteAddress?.includes('172.19.0.100')) {
      throw new ForbiddenException('Only gateway can access auth');
    }
    next();
  }
}

// auth.module.ts
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IpWhitelistMiddleware).forRoutes('*');
  }
}
```

### 9. HTTPS
- Gateway는 `ssl/` 디렉토리의 로컬 인증서로 TLS 환경 구성.

### 10. 초기 데이터
- `mongo-init.js`로 초기 이벤트/보상 데이터 자동 등록.
```js
// mongo-init.js
db = db.getSiblingDB('event-reward-platform-dev');
db.createCollection('sample_collection');

// 1일 출석 이벤트
const event = {
  code: 'ATT_101',
  name: '1일 출석 이벤트',
  description: '하루 1회 로그인 시 출석 보상',
  status: 'ACTIVE',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  conditions: { type: 'login_1day' },
  createdAt: new Date(),
  updatedAt: new Date(),
};
const eventResult = db.rewardevents.insertOne(event);
db.rewards.insertOne({
  name: '출석 포인트 1000',
  type: 'POINT',
  quantity: 1000,
  eventId: eventResult.insertedId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// 5회 로그인 이벤트
const eggEvent = {
  code: 'ATT_102',
  name: '이스터 에그 이벤트',
  description: '하루 로그인 5회 시 보상 지급!',
  status: 'ACTIVE',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  conditions: { type: 'login_count', threshold: 5 },
  createdAt: readFileSyncnew Date(),
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
```

## 향후 확장 가능성
- 스키마 기반 DDD 및 Repository 패턴 도입.
- 포인트 차감 로직 및 분산 락 구현.
- 다양한 조건 추가(예: 페이지 클릭, 구매 금액 초과).
- 쿠폰 발급/사용 로직 추가.
- 관리자 대시보드 연동.

---

## 테스트 코드
### 사전 등록된 이벤트 보상 지급 테스트 코드
```ts
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

  it('첫 로그인 시 출석 보상을 지급한다', async () => {
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

  it('이미 출석한 경우에는 출석 보상을 지급하지 않는다', async () => {
    mockRedisClient.get.mockResolvedValue('1'); // 이미 출석함
    mockRedisClient.incr.mockResolvedValue(2);

    await consumer.handleLoginEvent({ userId: 'user123' });

    expect(mockRewardGrantService.tryGrantReward).not.toHaveBeenCalledWith({
      userId: 'user123',
      eventCode: RewardEventCode.DAILY_ATTENDANCE,
      date: expect.any(String),
    });
  });

  it('로그인 5회째에는 이스터에그 보상을 지급한다', async () => {
    mockRedisClient.get.mockResolvedValue('1'); // 이미 출석 처리됨
    mockRedisClient.incr.mockResolvedValue(5); // 5회 로그인 도달

    await consumer.handleLoginEvent({ userId: 'user123' });

    expect(mockRewardGrantService.tryGrantReward).toHaveBeenCalledWith({
      userId: 'user123',
      eventCode: RewardEventCode.LOGIN_5_TIMES,
      date: expect.any(String),
    });
  });

  it('로그인 5회 이전에는 이스터에그 보상을 지급하지 않는다', async () => {
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
```

### 클린 코드를 위한 RewardGrantService 서비스 분리 테스트 코드
```ts
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
```