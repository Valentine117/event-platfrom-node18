# MSA 기반 이벤트/보상 플랫폼

## 프로젝트 개요
이 **이벤트/보상 플랫폼**은 유저의 특정 행동(예: 출석, 로그인 횟수)을 자동으로 감지하여 보상을 지급하는 시스템입니다. NestJS, MongoDB, Redis, RabbitMQ로 구성되며, `docker-compose up --build` 명령어로 쉽게 실행할 수 있습니다.

## 기술 스택
- **NestJS Monorepo + MSA 구조**: Monorepo 구조 내에 Gateway, Auth, Event 서버가 각각 독립적으로 구성되어 **명확한 서비스 책임 분리(MSA 구조)**를 실현.
- **MongoDB**: 이벤트, 보상, 요청 데이터를 저장.
- **Redis**: TTL 기반 출석 체크 및 로그인 횟수 관리. MongoDB 접근을 줄이고 이벤트 조건 검증을 빠르게 처리하기 위한 고속 캐시 레이어로 사용.
- **RabbitMQ**: 로그인 처리와 보상 지급을 분리함으로써 성능 최적화 + 서비스 독립성 확보.
- **Swagger**: API 문서 자동 생성.
- **HTTPS + 화이트리스 IP**: Gateway는 인증서를 통해 HTTPS를 지원하며, 고정 IP로 화이트리스트 통신을 구현.
- **Docker**: docker-compose.yml로 Gateway, Auth, Event, MongoDB, Redis, RabbitMQ를 한 줄 명령어로 실행 가능.

## 서버 아키텍처 (잠시 대기하면 사진이 로딩됩니다.)
![스크린샷 2025-05-18 오후 6 01 59](https://github.com/user-attachments/assets/81938ada-2781-453b-99b8-fa818a6dad79)

## Swagger 경로
- `https://localhost:3000/apis`: Gateway의 API 문서.

## API 목록
### 🔐 Auth
- `POST /auth/register`: 회원가입.
- `POST /auth/login`: 로그인(JWT 발급).

### ✅ Health
- `GET /health`: 서버, DB, RabbitMQ, Redis 상태 점검.

### 🗓️ Event (OPERATOR, USER, AUDITOR, ADMIN 허용 역할 분리)
- **ADMIN** 계정은 모든 API 요청 권한을 가지고 있습니다.
- `POST /event`: 이벤트 생성(OPERATOR).
- `GET /event`: 이벤트 목록 조회(공용).
- `PATCH /event/{eventId}`: 이벤트 수정(OPERATOR).
- `POST /event/{eventId}/rewards`: 보상 등록(OPERATOR).
- `POST /event/{eventId}/request`: 보상 요청(USER).
- `GET /event/requests`: 전체 요청 이력 조회(AUDITOR).
- `GET /event/requests/me`: 내 요청 이력 조회(USER).

## 설계 의도 및 구조 선택 이유
### 1. 이벤트 설계
- 이벤트는 `RewardEvent` 클래스로 정의되며, 고유 code를 기준으로 관리.
  예: ATT_101 (1일 1회 로그인), ATT_102 (하루 5회 로그인), REF_001 (추천 보상 이벤트)
- NestJS 예약어인 Event와의 충돌을 피하기 위해 `RewardEvent`라는 명칭을 사용.
- 이벤트의 타입은 LOGIN, RECOMMEND 등으로 enum화하여 조건을 명시적으로 구분.

### 2. 조건 검증 (Redis + MQ 기반)
- 로그인 성공 시 Gateway에서 user.logged_in 이벤트를 RabbitMQ로 발행.
- 이벤트 서버에서 MQ를 consume한 이후 Redis를 기반으로 보상 조건을 확인.
- 출석 체크: attendance:{userId}:{yyyy-mm-dd} → 하루 1회 TTL(86400)로 체크.
- 로그인 횟수: login-count:{userId}:{yyyy-mm-dd} → INCR로 카운팅, TTL 적용.

### 3. 보상 처리
- 보상은 `Reward` 엔티티로 관리, 이벤트와 1:N 관계.
- 조건 충족 시 `RewardRequest`를 생성하여 지급 여부 기록
- 보상 요청 중복 여부는 `(userId, eventId, rewardId)` 조합으로 판단
- 중복 혹은 `RewardEvent`의 status가 INACTIVE 혹은 이벤트 기간 `stardDate`, `endDate`에 해당하지 않을 시 status FAIL 인 `RewardRequest` 생성을 통한 실패 보상 요청 이력 확인 가능.

### 4. API 흐름
- **Gateway**: JWT 토큰 검증 및 역할 기반 권한 검사.
- **Auth**: `Client → Gateway → Auth → Gateway → Client`로 회원가입/로그인 처리, JWT 반환.
  - 단 로그인 성공 시 Gateway가 RabbitMQ로 userId 발행 후 Event 서버에서 Redis로 조건 검증 후 보상 지급.
- **Event**: `Client → Gateway → Event → Gateway → Client`로 이벤트/보상 처리.
- `docker-compose up --build` 시 `mongo-init.js`로 초기 이벤트 및 보상 등록.
- 로그인 성공 시 Gateway가 `userId`를 RabbitMQ로 발행, 이벤트 서버는 Redis로 조건 검증 후 보상 지급.

## 스키마 구조
### User 사용자/관리자
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  USER = 'USER',
  OPERATOR = 'OPERATOR',
  AUDITOR = 'AUDITOR',
  ADMIN = 'ADMIN',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.USER })
  role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);

```

### RewardEvent 이벤트
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EventStatus } from '@lib/common/enums/event-status.enum';
import { EventType } from '@lib/common/enums/event-type.enum';

export type RewardEventDocument = RewardEvent & Document;

@Schema({ timestamps: true })
export class RewardEvent {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({
    required: true,
    type: String,
    enum: EventStatus,
    default: EventStatus.INACTIVE,
  })
  status: EventStatus;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({
    required: true,
    type: String,
    enum: EventType,
  })
  eventType: EventType;

  @Prop({ required: true, min: 1 })
  streak: number;
}

export const RewardEventSchema = SchemaFactory.createForClass(RewardEvent);

// rewards virtual 필드 추가
RewardEventSchema.virtual('rewards', {
  ref: 'Reward', // 참조할 모델 이름
  localField: '_id', // RewardEvent의 _id
  foreignField: 'eventId', // Reward의 eventId
});

// JSON으로 응답 시 virtual 포함되도록 설정
RewardEventSchema.set('toObject', { virtuals: true });
RewardEventSchema.set('toJSON', { virtuals: true });
```

### Reward 이벤트 보상
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RewardDocument = Reward & Document;

export enum RewardType {
  POINT = 'POINT',
  ITEM = 'ITEM',
  COUPON = 'COUPON',
}

@Schema({ timestamps: true })
export class Reward {
  @Prop({ required: true })
  name: string;

  @Prop({ enum: RewardType, required: true })
  type: RewardType;

  @Prop({ required: true })
  quantity: number;

  @Prop({ type: Types.ObjectId, ref: 'RewardEvent', required: true })
  eventId: Types.ObjectId;
}

export const RewardSchema = SchemaFactory.createForClass(Reward);
```

### RewardRequest 유저 보상 발급 이력
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RewardRequestDocument = RewardRequest & Document;

export enum RewardRequestStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class RewardRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'RewardEvent', required: true })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Reward', required: true })
  rewardId: Types.ObjectId;

  @Prop({ enum: RewardRequestStatus, default: RewardRequestStatus.PENDING })
  status: RewardRequestStatus;
}

export const RewardRequestSchema = SchemaFactory.createForClass(RewardRequest);
```

## 테스트 방법
### 1. 프로젝트 실행
```bash
docker-compose up --build
```
- **주의**: Redis와 RabbitMQ 부팅이 느릴 수 있으므로, `https://localhost:3000/health`로 서비스 상태 확인 후 테스트 진행.
- 이벤트 서버는 Redis/RabbitMQ 미준비 시 헬스 체크 실패 가능.

### 2. 컨테이너 정리
```bash
docker-compose down -v --remove-orphans
```
- 반복 실행 시 `npm install` 디스크 공간 부족 에러 방지를 위해 볼륨 정리 권장.

### 3. Postman / Swagger 테스트
- 루트 디렉토리의 `EVENT_PLATFORM_NODE18.postman_collection.json`을 Postman으로 가져와 테스트.
- 또는 `https://localhost:3000/apis`의 Swagger로 테스트 가능.

### 4. API 테스트 (사전 등록 이벤트 보상 흐름)
#### (1) 헬스 체크
```bash
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
    "_id": "682b48e5a5d20b236e65d0fb",
    "code": "ATT_101",
    "name": "1일 출석 이벤트",
    "description": "하루 1회 로그인 시 출석 보상",
    "status": "ACTIVE",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T00:00:00.000Z",
    "eventType": "LOGIN",
    "streak": 1,
    "createdAt": "2025-05-19T15:06:13.650Z",
    "updatedAt": "2025-05-19T15:06:13.650Z",
    "rewards": [
      {
        "_id": "682b48e5a5d20b236e65d0fc",
        "name": "출석 포인트 1000",
        "type": "POINT",
        "quantity": 1000,
        "eventId": "682b48e5a5d20b236e65d0fb",
        "createdAt": "2025-05-19T15:06:13.658Z",
        "updatedAt": "2025-05-19T15:06:13.658Z"
      }
    ],
    "id": "682b48e5a5d20b236e65d0fb"
  },
  {
    "_id": "682b48e5a5d20b236e65d0fd",
    "code": "ATT_102",
    "name": "이스터 에그 이벤트",
    "description": "하루 로그인 5회 시 보상 지급!",
    "status": "ACTIVE",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T00:00:00.000Z",
    "eventType": "LOGIN",
    "streak": 5,
    "createdAt": "2025-05-19T15:06:13.680Z",
    "updatedAt": "2025-05-19T15:06:13.680Z",
    "rewards": [
      {
        "_id": "682b48e5a5d20b236e65d0fe",
        "name": "이스터 에그 포인트 100",
        "type": "POINT",
        "quantity": 100,
        "eventId": "682b48e5a5d20b236e65d0fd",
        "createdAt": "2025-05-19T15:06:13.682Z",
        "updatedAt": "2025-05-19T15:06:13.682Z"
      }
    ],
    "id": "682b48e5a5d20b236e65d0fd"
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
    "_id": "682b49b7dbe5608921cc03d6",
    "userId": "682b49b1a8874db219e9ef47",
    "eventId": {
      "_id": "682b48e5a5d20b236e65d0fb",
      "code": "ATT_101",
      "name": "1일 출석 이벤트",
      "description": "하루 1회 로그인 시 출석 보상",
      "status": "ACTIVE",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T00:00:00.000Z",
      "eventType": "LOGIN",
      "streak": 1,
      "createdAt": "2025-05-19T15:06:13.650Z",
      "updatedAt": "2025-05-19T15:06:13.650Z",
      "id": "682b48e5a5d20b236e65d0fb"
    },
    "rewardId": {
      "_id": "682b48e5a5d20b236e65d0fc",
      "name": "출석 포인트 1000",
      "type": "POINT",
      "quantity": 1000,
      "eventId": "682b48e5a5d20b236e65d0fb",
      "createdAt": "2025-05-19T15:06:13.658Z",
      "updatedAt": "2025-05-19T15:06:13.658Z"
    },
    "status": "SUCCESS",
    "createdAt": "2025-05-19T15:09:43.073Z",
    "updatedAt": "2025-05-19T15:09:43.073Z",
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
    "_id": "682b49b7dbe5608921cc03d6",
    "userId": "682b49b1a8874db219e9ef47",
    "eventId": {
      "_id": "682b48e5a5d20b236e65d0fb",
      "code": "ATT_101",
      "name": "1일 출석 이벤트",
      "description": "하루 1회 로그인 시 출석 보상",
      "status": "ACTIVE",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T00:00:00.000Z",
      "eventType": "LOGIN",
      "streak": 1,
      "createdAt": "2025-05-19T15:06:13.650Z",
      "updatedAt": "2025-05-19T15:06:13.650Z",
      "id": "682b48e5a5d20b236e65d0fb"
    },
    "rewardId": {
      "_id": "682b48e5a5d20b236e65d0fc",
      "name": "출석 포인트 1000",
      "type": "POINT",
      "quantity": 1000,
      "eventId": "682b48e5a5d20b236e65d0fb",
      "createdAt": "2025-05-19T15:06:13.658Z",
      "updatedAt": "2025-05-19T15:06:13.658Z"
    },
    "status": "SUCCESS",
    "createdAt": "2025-05-19T15:09:43.073Z",
    "updatedAt": "2025-05-19T15:09:43.073Z",
    "__v": 0
  },
  {
    "_id": "682b4a44dbe5608921cc03e1",
    "userId": "682b49b1a8874db219e9ef47",
    "eventId": {
      "_id": "682b48e5a5d20b236e65d0fd",
      "code": "ATT_102",
      "name": "이스터 에그 이벤트",
      "description": "하루 로그인 5회 시 보상 지급!",
      "status": "ACTIVE",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T00:00:00.000Z",
      "eventType": "LOGIN",
      "streak": 5,
      "createdAt": "2025-05-19T15:06:13.680Z",
      "updatedAt": "2025-05-19T15:06:13.680Z",
      "id": "682b48e5a5d20b236e65d0fd"
    },
    "rewardId": {
      "_id": "682b48e5a5d20b236e65d0fe",
      "name": "이스터 에그 포인트 100",
      "type": "POINT",
      "quantity": 100,
      "eventId": "682b48e5a5d20b236e65d0fd",
      "createdAt": "2025-05-19T15:06:13.682Z",
      "updatedAt": "2025-05-19T15:06:13.682Z"
    },
    "status": "SUCCESS",
    "createdAt": "2025-05-19T15:12:04.522Z",
    "updatedAt": "2025-05-19T15:12:04.522Z",
    "__v": 0
  }
]
```

#### (6) 유저가 이미 받은 보상 직접 재요청 및 요청 실패 이력 확인
```bash
# 이미 받은 1일 출석 이벤트 재요청 {eventId}, REWARD_ID 직접 입력
curl -X 'POST' \
  'https://localhost:3000/event/{eventId}/request' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
  "rewardId": "REWARD_ID"
}'
```
- 응답: status FAILED 생성
```json
{
  "userId": "682b49b1a8874db219e9ef47",
  "eventId": "682b48e5a5d20b236e65d0fb",
  "rewardId": "682b48e5a5d20b236e65d0fc",
  "status": "FAILED",
  "_id": "682b4b48dbe5608921cc03ec",
  "createdAt": "2025-05-19T15:16:24.117Z",
  "updatedAt": "2025-05-19T15:16:24.117Z",
  "__v": 0
}
```

- 유저 자신의 보상 재확인
```bash
# 보상 확인
curl -k 'https://localhost:3000/event/requests/me' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

- 응답: 배열 마지막에 status: FAILED 요청 확인 가능
```json
[
  {
    "_id": "682b49b7dbe5608921cc03d6",
    "userId": "682b49b1a8874db219e9ef47",
    "eventId": {
      "_id": "682b48e5a5d20b236e65d0fb",
      "code": "ATT_101",
      "name": "1일 출석 이벤트",
      "description": "하루 1회 로그인 시 출석 보상",
      "status": "ACTIVE",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T00:00:00.000Z",
      "eventType": "LOGIN",
      "streak": 1,
      "createdAt": "2025-05-19T15:06:13.650Z",
      "updatedAt": "2025-05-19T15:06:13.650Z",
      "id": "682b48e5a5d20b236e65d0fb"
    },
    "rewardId": {
      "_id": "682b48e5a5d20b236e65d0fc",
      "name": "출석 포인트 1000",
      "type": "POINT",
      "quantity": 1000,
      "eventId": "682b48e5a5d20b236e65d0fb",
      "createdAt": "2025-05-19T15:06:13.658Z",
      "updatedAt": "2025-05-19T15:06:13.658Z"
    },
    "status": "SUCCESS",
    "createdAt": "2025-05-19T15:09:43.073Z",
    "updatedAt": "2025-05-19T15:09:43.073Z",
    "__v": 0
  },
  {
    "_id": "682b4a44dbe5608921cc03e1",
    "userId": "682b49b1a8874db219e9ef47",
    "eventId": {
      "_id": "682b48e5a5d20b236e65d0fd",
      "code": "ATT_102",
      "name": "이스터 에그 이벤트",
      "description": "하루 로그인 5회 시 보상 지급!",
      "status": "ACTIVE",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T00:00:00.000Z",
      "eventType": "LOGIN",
      "streak": 5,
      "createdAt": "2025-05-19T15:06:13.680Z",
      "updatedAt": "2025-05-19T15:06:13.680Z",
      "id": "682b48e5a5d20b236e65d0fd"
    },
    "rewardId": {
      "_id": "682b48e5a5d20b236e65d0fe",
      "name": "이스터 에그 포인트 100",
      "type": "POINT",
      "quantity": 100,
      "eventId": "682b48e5a5d20b236e65d0fd",
      "createdAt": "2025-05-19T15:06:13.682Z",
      "updatedAt": "2025-05-19T15:06:13.682Z"
    },
    "status": "SUCCESS",
    "createdAt": "2025-05-19T15:12:04.522Z",
    "updatedAt": "2025-05-19T15:12:04.522Z",
    "__v": 0
  },
  {
    "_id": "682b4b48dbe5608921cc03ec",
    "userId": "682b49b1a8874db219e9ef47",
    "eventId": {
      "_id": "682b48e5a5d20b236e65d0fb",
      "code": "ATT_101",
      "name": "1일 출석 이벤트",
      "description": "하루 1회 로그인 시 출석 보상",
      "status": "ACTIVE",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T00:00:00.000Z",
      "eventType": "LOGIN",
      "streak": 1,
      "createdAt": "2025-05-19T15:06:13.650Z",
      "updatedAt": "2025-05-19T15:06:13.650Z",
      "id": "682b48e5a5d20b236e65d0fb"
    },
    "rewardId": {
      "_id": "682b48e5a5d20b236e65d0fc",
      "name": "출석 포인트 1000",
      "type": "POINT",
      "quantity": 1000,
      "eventId": "682b48e5a5d20b236e65d0fb",
      "createdAt": "2025-05-19T15:06:13.658Z",
      "updatedAt": "2025-05-19T15:06:13.658Z"
    },
    "status": "FAILED",
    "createdAt": "2025-05-19T15:16:24.117Z",
    "updatedAt": "2025-05-19T15:16:24.117Z",
    "__v": 0
  }
]
```

#### (7) AUDITOR, ADMIN, OPERATOR 역할별 추가 테스트
- 이벤트/보상 등록 및 수정은 `https://localhost:3000/apis` 또는 Postman으로 역할별 테스트 가능.

## 구현 중 고민과 선택
### JWT + 역할 기반(Role-Based) 접근 제어
- 사용자 인증은 JWT 기반으로 수행되며, 사용자 역할(USER, OPERATOR, AUDITOR, ADMIN)에 따라 API 접근 권한이 다르게 설정됩니다.
- NestJS의 @Roles() 데코레이터와 RolesGuard, JwtAuthGuard를 조합하여 역할 기반 접근 제어를 구현했습니다.
```ts
@Get('requests')
@Roles('AUDITOR')
@ApiOperation({
  summary: '전체 보상 요청 조회 (AUDITOR 전용)',
  description: '모든 보상 요청 이력을 조회합니다.',
})
getAllRequests(@Req() req) {
  return this.eventService.proxyGet(
    '/event/requests',
    req?.headers?.authorization,
  );
}
```

### 출석 보상 중복 방지
- Redis TTL(86400초)로 출석 보상 중복 지급 방지.
- attendance:{userId}:{yyyy-mm-dd} 키를 기준으로 중복 요청 방지.

### Redis 및 MQ(RabbitMQ) 사용 이유
- MongoDB 부하를 줄이기 위해, 실시간 조건 검증 및 중복 체크는 Redis에서 수행.
- RabbitMQ는 유저 로그인 이벤트를 비동기로 전송하여 Gateway의 응답 속도를 빠르게 유지하고, Event 서버에서 비동기적으로 보상 지급 로직을 처리.
- 이를 통해 MongoDB는 핵심 데이터 저장소로서의 역할에 집중할 수 있고, 고빈도 요청이 Redis/MQ에서 분산 처리되어 전체 시스템의 확장성과 안정성을 확보함.

### RabbitMQ 안정성
- 메시지 발행 실패가 로그인 실패로 이어지지 않도록 `fire-and-forget` 방식 채택.
- 로그인은 성공시키고, MQ 에러는 로그로만 처리.

### 공용 라이브러리
- `@lib/common`에 DTO, Enum, Schema, Guard 집중화로 코드 중복 감소 및 유지보수성 향상.
- 모든 서비스가 단일 소스에서 타입 정보를 가져가므로 유지보수성과 안정성 증가.

### 로깅 및 예외 처리
- Gateway에 `LoggingInterceptor`, `AllExceptionsFilter`, `CustomLogger` 글로벌 등록.
```ts
// main.ts
app.useGlobalInterceptors(app.get(LoggingInterceptor));
app.useGlobalFilters(app.get(AllExceptionsFilter));
app.useLogger(app.get(CustomLogger));
```

### 헬스 체크
- Gateway에서 Auth, Event, MongoDB, Redis, RabbitMQ 주기적 점검.
- MSA 환경에서 어느 서비스가 죽었는지 빠르게 파악 가능.
```ts
const authRes = await axios.get(`${authUrl}/health`);
const redisHealthy = await this.redisClient.ping();
```

### DTO 유효성 검증
- class-validator와 class-transformer를 활용하여 입력값을 DTO 수준에서 검증.
- 유효하지 않은 요청은 자동으로 400 BadRequest로 처리.
```ts
export class RegisterDto {
  @IsEmail()
  email: string;

  @Length(6, 20)
  password: string;
}
```

### 출석 체크 처리
- 로그인 시 MQ 이벤트를 수신한 Event 서버가 Redis를 통해 조건을 확인하고, 보상 지급 여부를 판단.
- 보상 지급 로직은 RewardGrantService로 분리하여 테스트 및 확장성 확보.
```ts
await this.rewardGrantService.tryGrantReward({
  userId,
  eventCode: RewardEventCode.DAILY_ATTENDANCE,
  date: today,
});
```

### 화이트리스트 및 보안
- Gateway는 Docker 네트워크 내 고정 IP(172.19.0.100)를 사용하여 내부 통신만 허용.
- Auth 서버 등은 IpWhitelistMiddleware로 외부 요청 차단.
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

### HTTPS
- Gateway는 로컬 개발 환경에서도 TLS 통신이 가능하도록 ssl/ 디렉토리에 인증서를 마운트하여 HTTPS 지원.

### 초기 데이터
- mongo-init.js를 통해 docker-compose up --build 시 자동으로 이벤트 및 보상 데이터를 등록.
- 테스트 준비 시간을 줄이고 일관된 환경 보장.
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

---

## 향후 확장 가능성
### 스키마 기반 DDD 및 Repository 패턴 도입.
- 현재는 Mongoose 모델에 직접 접근하지만, 도메인과 인프라의 분리를 통해 RewardRequest 등 핵심 도메인에 대한 비즈니스 로직을 더욱 명확히 할 수 있음
- Service → Repository → Model 구조로 책임 분리

### 포인트 차감 로직 및 분산 락 구현.
- 현재는 단순 보상 지급 위주의 구조이지만, 포인트 사용/차감 기능이 추가될 경우 반드시 Race Condition과 중복 지급/차감 문제가 발생할 수 있음
- Redis 기반의 분산 락(Lua + setnx) 또는 Redlock 알고리즘을 적용하여 멀티 인스턴스 환경에서도 정확한 처리 가능

### 이벤트 스케줄러 연동 및 예약 시스템.
- cron 기반의 예약 이벤트 또는 특정 시간대 자동 실행 로직 추가 가능
- 인프라 단계로 고도화 시 스케줄러 로직 API화 후 AWS EventBridge를 통해 정해진 시간에 이벤트 트리거 설정 + Lambda 함수를 호출하여 예약된 작업을 실행

### 쿠폰 발급/사용 로직 추가.
- 포인트 외에 쿠폰/아이템 보상 타입도 확장 가능 (이미 Reward.type으로 COUPON, ITEM 타입 지원)
- 쿠폰은 UUID 기반으로 생성 + 유저별 매핑 후 사용 여부 추적 필요

### 관리자 대시보드 연동.
- 운영자가 생성한 이벤트 및 지급 내역을 관리할 수 있는 웹 UI 기반 Admin Dashboard 추가 가능
- 보상 내역 필터링 (날짜/유저/이벤트 코드별)
- 지급률 분석, Redis TTL 현황, MQ 상태 실시간 모니터링

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
```

### 클린 코드를 위한 RewardGrantService 서비스 분리 테스트 코드
```ts
// reward-grant.service.spec.ts
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
```
