# MSA기반 이벤트/보상 플랫폼 설계 설명

## 프로젝트 개요
유저의 특정 행위(출석, 로그인 횟수 등)를 자동으로 감지하여 보상을 지급하는 **이벤트/보상 플랫폼**입니다. 모든 기능은 NestJS + MongoDB + Redis + RabbitMQ를 기반으로 구성되며, `docker-compose up --build` 한 줄로 실행 가능합니다.

---

## 기술 스택
- **NestJS Monorepo(MSA 구조)**: Gateway / Auth / Event 서비스가 완전히 독립된 모듈로 동작하는 MSA 구조를 따르며, **Monorepo를 선택한 이유는 공용 도메인(`@lib/common`)을 통한 일관된 타입, DTO, 스키마 관리를 위함**입니다. 이를 통해 서비스 간 중복 없이 안정적인 인터페이스 공유가 가능합니다.
- **MongoDB**: 이벤트, 보상, 요청 등 모든 데이터 저장
- **Redis**: TTL 기반 출석 체크, 로그인 횟수 관리
- **RabbitMQ**: 비동기 이벤트 전달 (로그인 이벤트)
- **Swagger**: API 문서 자동 생성
- **HTTPS + 고정 IP 설정**: Gateway는 인증서를 마운트하여 HTTPS 지원 + 내부 통신 시 IP 고정으로 whitelist 가능

---

## 서버 아키텍처


---

## Swagger 경로
`https://localhost:3000/apis` → Gateway 기준 API 문서

---

## API 목록
### 🔐 Auth
- `POST /auth/register` : 회원가입
- `POST /auth/login` : 로그인 (JWT 발급)

### ✅ Health
- `GET /health` : 서버/DB/MQ/Redis 헬스 체크

### 🗓️ Event (운영자/유저 공용)
- `POST /event` : 이벤트 생성 (운영자)
- `GET /event` : 이벤트 목록 조회 (공용)
- `POST /event/{eventId}/rewards` : 특정 이벤트에 보상 등록 (운영자)
- `POST /event/{eventId}/request` : 보상 요청 (유저)
- `GET /event/requests` : 전체 요청 이력 조회 (감사/관리자)
- `GET /event/requests/me` : 내 요청 이력 조회 (유저)

---

## 설계 의도 및 구조 선택 이유

### 1. 이벤트 설계
- 이벤트는 `RewardEvent`라는 이름의 도메인 클래스로 정의되며, 고유한 `code`를 기반으로 관리됩니다.
- `Event`라는 이름을 사용하지 않은 이유는 NestJS의 내장 `Event` 객체 및 관련 헬퍼들과 혼동을 피하기 위함입니다.
- 예: `ATT_101`(1일 출석), `ATT_102`(하루 5회 로그인) 등
- 유연성을 위해 조건(`conditions`)은 JSON 객체로 설계

### 2. 조건 검증 방식
- 로그인 시 MQ를 통해 이벤트 서버에 메시지를 발행
- 이벤트 서버는 Redis를 활용하여 조건 달성 여부를 검증
    - 출석: `attendance:{userId}:{yyyy-mm-dd}` 키로 1일 1회 기록
    - 로그인 횟수: `login-count:{userId}:{yyyy-mm-dd}` 키를 `incr()`로 증가시키고 TTL 부여

### 3. 보상 처리 구조
- 보상은 `Reward` 엔티티로 관리되며 이벤트와 1:N 관계
- 유저가 보상을 받으면 `RewardRequest`가 생성되어 중복 지급 방지
- 중복 방지는 `(userId, eventId, rewardId, date)` 기준으로 판단

### 4. API 구조
- **Gateway**:  모든 API 요청의 진입점, 인증, 권한 검사 및 라우팅
- **Auth**:  유저 정보 관리, 로그인, 역할 관리, JWT 발급
- **Event**: 이벤트 생성, 보상 정의, 보상 요청 처리, 지급 상태 저장
- Client → Gateway → Auth → Gateway → Client JWT 반환 구조로 회원가입 및 로그인 요청 전달
- Client → Gateway → Event → Gateway -> Client 를 통한 이벤트 및 보상 상호작용 가능
- Guard를 통한 JWT 토큰 검증 및 API 승인 가능 역할 검사
- "docker-compose up --build 실행 시 mongo-init.js로 인한 사전 설정한 로그인 출석체크 관련 이벤트 및 보상 등록."
- Gateway는 로그인 성공 시 userId를 MQ로 발행 (token decode)
- Event 서버는 메시지를 consume하여 redis를 통한 조건 검증 및 보상 지급

---

## 테스트 방법
### git clone 후 `docker-compose up --build` 명렁어로 각 Gateway, Auth, Event 서버 & MongoDB & Redis & RabbitMQ 실행
```bash
  # docker-compose up --build를 많이 시도할 경우
  # npm install 공간이 없다는 에러가 나올 수 있으니 볼륨 및 컨테이너 정리를 권장합니다.

  # 모든 서비스 실행
  docker-compose up --build

  # 모든 서비스 중지 및 삭제
  docker-compose down -v --remove-orphans 
```

- **주의**: redis와 RabbitMQ는 부팅 속도가 느리므로 `https://localhost:3000/health` api를 통한 모든 서비스 정상 작동 확인 후 테스트 진행
  - redis, mq 실행 전 event 서버 또한 health check fail 할 수 있음.


## Postman 활용 시 바로 import하여 테스트 가능한 루트 디렉토리의 파일 활용
```html
EVENT_PLATFORM_NODE18_TEST.postman_collection.json
```
- 혹은 서버 실행 후 swagger를 통한 테스트 가능 `https://localhost:3000/apis`

## API 요청 테스트 진행 (사전 등록 이벤트 보상 취득 flow)
### 도커 실행 후 health check
```bash
# 모든 서비스 실행
docker-compose up --build

# 헬스 체크 curl
curl -k 'https://localhost:3000/health'
```

- 헬스 체크 응답
  - 주의: 처음엔 MQ 부팅 속도 때문에 event status 가 fail로 나올 수 있음.
```json
{
    "gateway": {
        "status": "ok"
    },
    "mongo": {
        "status": "ok",
        "durationMs": 0
    },
    "redis": {
        "status": "ok",
        "durationMs": 2
    },
    "rabbitmq": {
        "status": "ok",
        "durationMs": 3
    },
    "auth": {
        "status": "ok",
        "durationMs": 16
    },
    "event": {
        "status": "ok",
        "durationMs": 14
    }
}
```

### OPERATOR, USER, ADMIN, AUDITOR 로 각각 회원가입 및 로그인
```bash
# 필요에 맞게 role, email, password 변경
curl -k 'https://localhost:3000/auth/register' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "operator@example.com",
    "password": "123456",
    "role": "OPERATOR"
}'
```

- 회원 가입 성공 응답
```json
{
  "message": "가입 완료."
}
```

- 로그인
```bash
curl -k 'https://localhost:3000/auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{"email":"operator@example.com", "password":"123456"}'
```

- 로그인 성공 응답
```json
{
  "accessToken": "YOUR_TOKEN"
}
```

## 서버 시작과 동시에 mongo-init.js로 등록된 이벤트와 보상 확인
```bash
curl -k 'https://localhost:3000/event' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

- 이벤트 + 보상 목록
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
    "conditions": {
      "type": "login_1day"
    },
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
    "conditions": {
      "type": "login_count",
      "threshold": 5
    },
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

### 유저 회원 가입, 로그인 1회 시도 후 나의 보상 확인
```bash
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

curl -k 'https://localhost:3000/event/requests/me' \
--header 'Authorization: Bearer YOUR_TOKEN'
```
- 유저가 요청한 나의 보상목록 응답
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
            "conditions": {
                "type": "login_1day"
            },
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

- 로그인 5회 시도 후 나의 보상목록 응답

- 5회 시도
```bash
curl -k 'https://localhost:3000/auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{"email":"user@example.com", "password":"123456"}'
```

- 보상 목록 응답
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
            "conditions": {
                "type": "login_1day"
            },
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
            "conditions": {
                "type": "login_count",
                "threshold": 5
            },
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

### 이외 Role 별로 이벤트, 보상 등록 및 요청은 api문서에서 테스트 확인 가능합니다.

---

## 구현 중 고민과 선택

- **출석 보상 중복 방지**를 위해 Redis TTL을 정확히 설정 (86400초)
- **MQ 발행 실패가 로그인 실패로 이어지지 않도록** `fire-and-forget` 방식 선택
- **Mono library 통합 관리**: 모든 공용 DTO, Enum, Schema, Guard를 `@lib/common`으로 집중화하여 MSA 구조여도 코드 중복 제거 및 유지보수 용이성 확보
- **Interceptor / Filter / Logging 구성**: Gateway에 `LoggingInterceptor`, `AllExceptionsFilter`, `CustomLogger`를 글로벌 등록하여 요청/응답 로깅 및 예외 공통 처리 수행

```ts
// main.ts
app.useGlobalInterceptors(app.get(LoggingInterceptor));
app.useGlobalFilters(app.get(AllExceptionsFilter));
app.useLogger(app.get(CustomLogger));
```

- **모든 서버 및 DB, Redis, MQ 헬스 체크 구현**
    - Gateway는 Auth, Event, MongoDB, Redis, RabbitMQ를 주기적으로 핑하여 상태 확인 가능

```ts
const authRes = await axios.get(`${authUrl}/health`);
const redisHealthy = await this.redisClient.ping();
```

- **DTO 기반 유효성 검증 및 BadRequest 처리**

```ts
export class RegisterDto {
  @IsEmail()
  email: string;

  @Length(6, 20)
  password: string;
}
```

- **출석 체크를 MQ + Redis 기반 + Service 패턴 분리로 구성**
    - Consumer에서 MQ 메시지를 수신하여 Redis 키 검증 후 Service (`RewardGrantService`)를 통해 보상 처리

```ts
await this.rewardGrantService.tryGrantReward({
  userId,
  eventCode: RewardEventCode.DAILY_ATTENDANCE,
  date: today,
});
```

- **Whitelist 관리 기능 구현**: Gateway는 내부 IP를 고정하여 서비스 간 화이트리스트 통신이 가능하도록 docker network 설정 + IP 고정 설정

```yaml
# docker-compose.yml gateway ip 고정
networks:
  app_net:
    ipv4_address: 172.19.0.100 # 화이트 리스트 관리를 위한 gateway ip 고정
```

```ts
// whitelist.middleware.ts
@Injectable()
export class IpWhitelistMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const remoteAddress = req.connection.remoteAddress;

    console.log('Request from:', remoteAddress); // 확인용

    if (!remoteAddress?.includes('172.19.0.100')) {
      throw new ForbiddenException('Only gateway can access auth');
    }

    next();
  }
}

// auth.module.ts
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IpWhitelistMiddleware).forRoutes('*'); // 모든 경로 보호
  }
}
```

- **HTTPS 적용**: Gateway는 로컬 인증서(`ssl/`)를 바인딩하여 TLS 환경 구성 완료
- **테스트를 위한 mongo-init.js 제공**: `docker-compose up --build` 시 자동으로 이벤트 및 보상 데이터가 등록되어 로그인 MQ 테스트가 바로 가능함

```js
// mongo-init.js
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

```

---

## ✅ 향후 확장 가능성
- Schema 기반 DDD 설계 및 Repository 분리
- 실제 포인트 사용하는 차감 로직 + 분산 락 구현
- 출석 외 다양한 조건 추가 (ex. 특정 페이지 클릭, 구매 금액 초과 등)
- 쿠폰 발급/사용 로직 추가
- 관리자 페이지 연동
