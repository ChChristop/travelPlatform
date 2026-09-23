# Travel Planning Platform — Domain & Data Model Design

> Status: Draft / architecture baseline  
> Purpose: 여행 계획, 대안 비교, 예약, 비용, 지도, 시뮬레이션, LIVE 실행, 공유/Fork까지 확장 가능한 공통 데이터 구조 정의  
> Audience: 구현 에이전트 / 프론트엔드 / 백엔드 / 데이터 모델 설계

---

## 1. 문서 목적

이 프로젝트는 단순한 "여행 일정표"가 아니라 다음 기능을 하나의 데이터 모델 위에서 처리하는 여행 계획·실행 플랫폼을 목표로 한다.

- 여러 여행 프로젝트 관리
- 날짜별/시간별 일정 구성
- 숙소/식사/교통/관광 등 다양한 여행 단위 관리
- Plan A / B / C 및 후보군 관리
- 예약 필요 여부와 실제 예약 기록 관리
- 예상/확정/실제 비용 관리
- 지도 및 경로 표현
- 체크리스트/준비사항 관리
- 여행 전 시뮬레이션
- 여행 중 LIVE 진행
- 계획과 실제 실행 결과 비교
- 다른 사용자와 공유
- 공개 여행계획 Fork/복제
- 여행 템플릿화
- 향후 공동 편집 및 자동 최적화

이 문서의 가장 중요한 목적은 **UI 메뉴별로 데이터를 따로 만들지 않고, 공통 도메인 객체를 여러 View가 공유하도록 설계하는 것**이다.

---

## 2. 핵심 설계 원칙

### 2.1 메뉴는 데이터를 소유하지 않는다

`Timeline`, `Map`, `Cost`, `Booking`, `Live`, `Simulation` 등의 메뉴는 각각 별도 데이터를 저장하는 공간이 아니다.

모든 메뉴는 동일한 공통 도메인 데이터를 서로 다른 관점으로 조회하는 **View**다.

예:

```text
PlanItem: Smile Hotel Kyoto Shijo 숙박

Timeline
→ 9/28~9/30 숙박 일정으로 표시

Map
→ 호텔 위치 표시

Cost
→ 숙박비 ¥18,000 표시

Booking
→ 예약 상태 및 예약번호 표시

Plans
→ 다른 숙소 후보와 비교

Live
→ 체크인 시점에 현재 해야 할 일 표시
```

한 View에서 PlanItem 또는 연결 객체를 수정하면 다른 View도 자동으로 반영되어야 한다.

### 2.2 여행의 의미 단위는 `PlanItem`

날짜, 도시, 비용 카테고리 등을 데이터 계층의 부모/자식으로 만들지 않는다.

예를 들어 다음은 하나의 여행 단위다.

```text
Smile Hotel Kyoto Shijo
교토
9/28 ~ 9/30
2박
¥18,000
```

잘못된 개념:

```text
숙박
└─ 교토
   └─ Smile Hotel
      ├─ 9/28
      └─ 9/29
```

권장 개념:

```text
PlanItem
"Smile Hotel Kyoto Shijo 숙박"

attributes:
- city = Kyoto
- start = 2026-09-28
- end = 2026-09-30
- type = lodging
```

`교토`, `날짜`, `숙박`, `¥18,000`은 PlanItem을 설명하거나 분석하기 위한 속성/Dimension/Relation이다.

### 2.3 Entity / Attribute / Relation / Breakdown / Dimension 구분

| 개념 | 의미 | 예 |
|---|---|---|
| Entity | 독립적으로 의미를 갖는 개체 | Smile Hotel 숙박 |
| Type | Entity 종류 | lodging |
| Attribute | 개체 자체의 속성 | 9/28~9/30 |
| Relation | 다른 개체와의 관계 | Booking, CostRecord |
| Breakdown | 하나의 값 내부 상세 | 9/28 ¥8,000 + 9/29 ¥10,000 |
| Dimension | 조회/분류/집계 축 | 교토, 숙박, 날짜 |
| Alternative | 대체 가능한 후보 | Hotel Resol |
| Execution | 실제 여행 시 발생한 실행 결과 | 실제 체크인 16:42 |

---

## 3. 전체 구조

```text
Workspace
│
├─ Place Library
├─ Collections
├─ Templates
│
└─ TravelProject
     │
     ├─ PlanVersion
     │    │
     │    ├─ PlanItem
     │    ├─ PlanFragment
     │    ├─ OptionGroup
     │    ├─ Scenario
     │    └─ Constraint
     │
     ├─ Booking
     ├─ CostRecord
     ├─ Route
     ├─ Task
     ├─ Attachment
     │
     └─ TripRun
          ├─ ItemExecution
          ├─ Actual Cost
          └─ Journal
```

---

## 4. Workspace

사용자의 여행 관련 자산 전체를 담는 최상위 컨테이너.

```ts
interface Workspace {
  id: string;
  ownerId: string;

  projectIds: string[];
  templateIds: string[];
  collectionIds: string[];
}
```

예:

```text
My Workspace

├─ Kansai 2026
├─ Tokyo 2027
├─ Taiwan 2027
└─ Europe 2028
```

향후 협업 Workspace를 지원할 수도 있다.

---

## 5. TravelProject

`Trip`보다 더 큰 개념.

실제 여행뿐 아니라 다음을 모두 포함한다.

- 조사
- 후보 장소
- 계획
- Plan A/B/C
- 예약
- 예산
- 체크리스트
- 시뮬레이션
- 공유
- Version
- 실제 실행

```ts
interface TravelProject {
  id: string;
  workspaceId: string;

  title: string;
  description?: string;

  startDate?: string;
  endDate?: string;
  timezone: string;

  status:
    | "research"
    | "planning"
    | "ready"
    | "active"
    | "completed"
    | "archived";

  visibility:
    | "private"
    | "link"
    | "public";

  activePlanVersionId?: string;

  source?: {
    type: "original" | "fork" | "template";
    projectId?: string;
    planVersionId?: string;
  };
}
```

---

## 6. PlanVersion

여행계획은 버전을 가져야 한다.

```ts
interface PlanVersion {
  id: string;
  projectId: string;

  version: number;
  parentVersionId?: string;

  status:
    | "draft"
    | "published"
    | "archived";

  createdAt: string;
  comment?: string;
}
```

### 필요한 이유

#### 공유/Fork

```text
User A
Kansai v5
   ↓ fork
User B
Kansai v1
```

원본 사용자가 v6으로 변경하더라도 Fork한 사용자의 계획은 깨지지 않아야 한다.

#### LIVE 실행

TripRun은 특정 PlanVersion을 기준으로 시작해야 한다.

```text
TripRun
planVersionId = Kansai v7
```

여행 중 원본 계획이 변경되더라도 실행 기록이 바뀌지 않아야 한다.

---

## 7. PlanItem

플랫폼의 핵심 Entity.

여행계획에서 의미를 갖는 최소 단위다.

```ts
type PlanItemType =
  | "lodging"
  | "meal"
  | "transport"
  | "attraction"
  | "shopping"
  | "flight"
  | "event"
  | "freeTime"
  | "task"
  | "custom";
```

```ts
interface PlanItem {
  id: string;
  planVersionId: string;

  type: PlanItemType;

  title: string;
  description?: string;

  schedule: Schedule;

  places: PlaceReference[];

  detail: PlanItemDetail;

  bookingPolicy?: BookingPolicy;

  status:
    | "candidate"
    | "planned"
    | "confirmed"
    | "cancelled";

  tags?: string[];
}
```

---

## 8. Schedule

```ts
interface Schedule {
  start?: string;
  end?: string;

  allDay?: boolean;

  flexibility?: {
    type:
      | "fixed"
      | "window"
      | "flexible";

    earliestStart?: string;
    latestStart?: string;
  };
}
```

예:

### 식당 예약

```text
start = 12:00
type = fixed
```

### 관광

```text
earliestStart = 09:00
latestStart = 11:00
type = window
```

---

## 9. Place와 PlanItem을 분리

장소 자체와 해당 장소에서 무엇을 하는지는 다른 개념이다.

```text
Place
Smile Hotel Kyoto Shijo

≠

PlanItem
2026-09-28 ~ 09-30
Smile Hotel Kyoto Shijo 숙박
```

### Place

```ts
interface Place {
  id: string;

  name: string;
  localName?: string;

  address?: string;

  coordinates?: {
    lat: number;
    lng: number;
  };

  region?: {
    country?: string;
    prefecture?: string;
    city?: string;
  };

  providerIds?: {
    osm?: string;
    google?: string;
  };

  urls?: {
    official?: string;
    map?: string;
  };
}
```

`Place`는 여러 TravelProject에서 재사용할 수 있다.

---

## 10. PlaceReference

PlanItem은 장소를 직접 소유하지 않고 참조한다.

```ts
interface PlaceReference {
  placeId: string;

  role:
    | "primary"
    | "origin"
    | "destination"
    | "stop";
}
```

예:

### 숙박

```text
primary → Smile Hotel Kyoto Shijo
```

### 식당

```text
primary → Aburiya Umeda
```

### 교통

```text
origin      → Osaka Station
destination → Himeji Station
```

---

## 11. 타입별 PlanItem Detail

공통 PlanItem에 모든 타입의 속성을 넣지 않는다.

Discriminated Union 구조를 권장한다.

```ts
type PlanItemDetail =
  | LodgingDetail
  | MealDetail
  | TransportDetail
  | AttractionDetail
  | FlightDetail
  | CustomDetail;
```

### Lodging

```ts
interface LodgingDetail {
  type: "lodging";

  roomType?: string;

  checkInTime?: string;
  checkOutTime?: string;

  luggageStorage?: {
    beforeCheckIn?: boolean;
    afterCheckOut?: boolean;
  };
}
```

`nights`는 시작/종료 날짜로 계산 가능하므로 기본적으로 Derived Data로 취급할 수 있다.

---

## 12. BookingPolicy와 Booking의 분리

예약은 두 종류의 개념으로 분리한다.

### BookingPolicy

PlanItem 자체의 예약 관련 성격.

```ts
interface BookingPolicy {
  availability:
    | "available"
    | "notAvailable"
    | "unknown";

  requirement:
    | "required"
    | "recommended"
    | "optional"
    | "walkInOnly";

  note?: string;
}
```

예:

```text
돈카츠 세이젠

예약 가능
예약 권장
```

아직 실제 예약을 하지 않았다면 Booking 객체는 존재하지 않을 수 있다.

---

## 13. Booking

실제로 발생한 예약을 나타내는 독립 Entity.

```ts
interface Booking {
  id: string;

  planItemIds: string[];

  type:
    | "hotel"
    | "restaurant"
    | "flight"
    | "ticket"
    | "transport"
    | "tour"
    | "other";

  status:
    | "draft"
    | "requested"
    | "confirmed"
    | "cancelled"
    | "completed"
    | "failed";

  provider?: string;

  datetime?: string;

  partySize?: number;

  confirmationCode?: string;

  bookingUrl?: string;

  bookedAt?: string;

  cancellationDeadline?: string;

  costRecordIds?: string[];
  attachmentIds?: string[];
}
```

### Booking을 독립 객체로 두는 이유

한 PlanItem에 여러 예약 이력이 존재할 수 있다.

```text
Booking #1
12:00
cancelled

Booking #2
13:00
confirmed
```

또한 항공 왕복 예약처럼 하나의 Booking이 여러 PlanItem을 포함할 수도 있다.

```text
Booking
├─ ICN → KIX
└─ UKB → ICN
```

---

## 14. CostRecord

비용은 독립 객체로 관리한다.

PlanItem 안에 가격 정보를 깊게 중첩하지 않는다.

```ts
interface Money {
  amount: number;
  currency: string;
}
```

```ts
interface CostRecord {
  id: string;

  subject: {
    type:
      | "planItem"
      | "booking"
      | "route"
      | "project";

    id: string;
  };

  type:
    | "estimate"
    | "committed"
    | "actual"
    | "refund";

  category:
    | "lodging"
    | "food"
    | "transport"
    | "attraction"
    | "shopping"
    | "other";

  total: Money;

  breakdown?: CostBreakdown[];

  servicePeriod?: {
    start: string;
    end?: string;
  };

  payment?: PaymentInfo;
}
```

---

## 15. CostBreakdown

하나의 비용 내부 상세.

새로운 PlanItem이 아니다.

```ts
interface CostBreakdown {
  type:
    | "night"
    | "person"
    | "fee"
    | "tax"
    | "discount"
    | "custom";

  date?: string;

  label?: string;

  amount: Money;
}
```

### 예 1: 총액만 알고 있을 때

```ts
{
  total: {
    amount: 18000,
    currency: "JPY"
  }
}
```

UI:

```text
Smile Hotel Kyoto Shijo
9/28 ~ 9/30
¥18,000
```

### 예 2: 일자별 가격이 있을 때

```ts
{
  total: {
    amount: 18000,
    currency: "JPY"
  },

  breakdown: [
    {
      type: "night",
      date: "2026-09-28",
      amount: {
        amount: 8000,
        currency: "JPY"
      }
    },
    {
      type: "night",
      date: "2026-09-29",
      amount: {
        amount: 10000,
        currency: "JPY"
      }
    }
  ]
}
```

UI:

```text
Smile Hotel Kyoto Shijo
교토 · 9/28~9/30 · 2박
총 ¥18,000

9/28 ¥8,000
9/29 ¥10,000
```

중요:

```text
9/28
9/29
```

는 별개의 숙박 Entity가 아니다.

하나의 숙박 PlanItem에 연결된 CostRecord의 Breakdown이다.

---

## 16. 비용 View

Cost 메뉴는 CostRecord를 특정 방식으로 조회하는 View다.

지원 가능한 예:

```text
[시간순]
[날짜별]
[항목별]
[도시별]
[계획/확정/실제]
[결제 상태별]
[Plan별]
```

### 항목별

```text
숙박

Smile Hotel Kyoto Shijo
교토 · 9/28~9/30
¥18,000

SARASA HOTEL Shinsaibashi
오사카 · 9/26~9/28
¥17,600
```

### 날짜별

동일한 숙박 개체가 CostBreakdown에 의해 여러 날짜에 투영될 수 있다.

```text
9/28
Smile Hotel Kyoto Shijo
¥8,000

9/29
Smile Hotel Kyoto Shijo
¥10,000
```

두 행 모두 동일한 PlanItem을 가리킨다.

---

## 17. 계획 / 확정 / 실제 비용

비용은 최소 다음 세 상태를 구분해야 한다.

### estimate

아직 예약/결제되지 않은 예상 비용.

### committed

예약 또는 선결제로 사실상 확정된 비용.

### actual

실제 여행 과정에서 발생한 최종 비용.

예:

```text
              계획       확정       실제

숙소         ¥32,000    ¥34,200    ¥34,200
식사         ¥28,000    ¥10,368    ¥29,420
교통         ¥18,000     ¥4,000    ¥17,610
```

---

## 18. PaymentInfo

```ts
interface PaymentInfo {
  status:
    | "unpaid"
    | "paid"
    | "refunded";

  paidAt?: string;

  methodId?: string;

  payerId?: string;
}
```

향후 카드/현금/외화계좌/공동여행 정산 등에 확장 가능하다.

---

## 19. PlanFragment

여러 PlanItem을 하나의 선택 단위로 묶는다.

```ts
interface PlanFragment {
  id: string;

  title?: string;

  planItemIds: string[];

  routeIds?: string[];
  taskIds?: string[];

  note?: string;
}
```

Fragment는 PlanItem 하나만 포함할 수도 있다.

---

## 20. OptionGroup

Plan A/B/C, 식당 1순위/백업, 숙소 후보 등을 하나의 공통 구조로 처리한다.

```ts
interface OptionGroup {
  id: string;

  title: string;

  optionIds: string[];

  selectedOptionId?: string;
}
```

```ts
interface PlanOption {
  id: string;

  label: string;

  fragmentId: string;

  priority?: number;

  note?: string;
}
```

---

## 21. 숙소 후보 예

```text
OptionGroup
"교토 숙소"

Plan A
└─ Fragment
   └─ Smile Hotel Kyoto Shijo
      교토 · 9/28~9/30 · ¥18,000

Plan B
└─ Fragment
   └─ Hotel Resol Kyoto
      교토 · 9/28~9/30 · ¥23,600

Plan C
└─ Fragment
   └─ Sotetsu Fresa
      교토 · 9/28~9/30 · ¥15,800
```

Plan B로 변경한다는 것은 가격만 바꾸는 것이 아니다.

**숙박 PlanItem 전체가 다른 후보 PlanItem으로 교체되는 것**이다.

따라서 다음 정보가 함께 변경될 수 있다.

- 위치
- 예약
- 비용
- 체크인/아웃
- 연결 Route
- LIVE 목적지
- Simulation 이동시간
- Checklist

---

## 22. 하루 전체 Plan B 예

동일한 OptionGroup 구조를 더 큰 범위에서도 사용할 수 있다.

```text
OptionGroup
"9/27 오후"

Plan A
├─ 히메지 이동
├─ 센트럴파크
├─ 불꽃놀이
└─ 오사카 귀환

Plan B
├─ 우메다
├─ 오사카성
├─ 저녁
└─ 도톤보리
```

따라서 숙소 후보와 하루 대체 일정이 동일한 엔진으로 처리된다.

---

## 23. OptionGroup과 Scenario의 차이

### OptionGroup

> 무엇을 선택할 것인가?

예:

```text
교토 숙소
A / B / C
```

### Scenario

> 어떤 상황을 가정할 것인가?

예:

```text
Normal
Rain
Budget
30min Delay
```

```ts
interface Scenario {
  id: string;

  title: string;

  type:
    | "normal"
    | "weather"
    | "delay"
    | "budget"
    | "fatigue"
    | "custom";

  variables: Record<string, unknown>;

  optionSelections: {
    optionGroupId: string;
    optionId: string;
  }[];
}
```

Simulation에서 활용한다.

---

## 24. Constraint

일정 자동 최적화 및 시뮬레이션을 위해 제약조건을 별도 모델링한다.

```ts
interface Constraint {
  id: string;

  subjectId: string;

  type:
    | "fixedTime"
    | "timeWindow"
    | "minDuration"
    | "maxDuration"
    | "mustBefore"
    | "mustAfter"
    | "openingHours"
    | "reservation"
    | "budget"
    | "weather"
    | "distance";

  value: unknown;

  hardness:
    | "hard"
    | "soft";
}
```

예:

```text
카네이 18:00 예약
→ hard

아라시야마 07:45 권장
→ soft
```

향후 자동 일정 최적화 시 사용한다.

---

## 25. Route

경로는 PlanItem과 분리한다.

```ts
interface Route {
  id: string;

  fromPlaceId: string;
  toPlaceId: string;

  mode:
    | "walk"
    | "train"
    | "bus"
    | "taxi"
    | "car"
    | "flight"
    | "mixed";

  plannedDurationMinutes?: number;

  distanceMeters?: number;

  geometry?: unknown;

  legs?: RouteLeg[];
}
```

PlanItem이 Route를 참조한다.

이를 통해 지도 View와 Simulation이 동일한 경로 데이터를 사용할 수 있다.

---

## 26. Task

체크리스트와 LIVE 준비사항을 동일한 Task 모델로 처리한다.

```ts
interface Task {
  id: string;

  title: string;

  linkedPlanItemId?: string;

  status:
    | "todo"
    | "done"
    | "skipped";

  trigger?: Trigger;
}
```

---

## 27. Trigger

```ts
type Trigger =
  | {
      type: "absoluteTime";
      at: string;
    }
  | {
      type: "beforePlanItem";
      planItemId: string;
      minutes: number;
    }
  | {
      type: "afterPlanItem";
      planItemId: string;
    }
  | {
      type: "enterPlace";
      placeId: string;
      radiusMeters: number;
    };
```

예:

```text
아부리야 30분 전
→ 예약 화면 준비

KIX 도착 후
→ 입국심사 진행

도후쿠지 완료
→ 호텔에서 캐리어 회수
```

---

## 28. 계획과 실제 실행 분리

계획 데이터를 실제 여행 결과로 덮어쓰지 않는다.

예:

```text
계획
아부리야 12:00

실제
아부리야 12:17 도착
```

PlanItem의 `schedule.start`를 12:17로 수정하면 안 된다.

---

## 29. TripRun

실제 여행 실행 단위.

```ts
interface TripRun {
  id: string;

  projectId: string;
  planVersionId: string;

  status:
    | "notStarted"
    | "active"
    | "paused"
    | "completed";

  startedAt?: string;
  completedAt?: string;
}
```

---

## 30. ItemExecution

```ts
interface ItemExecution {
  id: string;

  tripRunId: string;
  planItemId: string;

  status:
    | "pending"
    | "active"
    | "completed"
    | "skipped";

  actualStart?: string;
  actualEnd?: string;

  note?: string;
}
```

이를 통해 계획과 실제를 비교할 수 있다.

```text
아라시야마

계획
07:45 → 10:30

실제
07:58 → 10:47
```

---

## 31. LIVE View

LIVE는 PlanItem + TripRun + ItemExecution + Task + Route를 조합한다.

예:

```text
13:42

현재
니부노역

다음
히메지 센트럴파크

택시
14:00

해야 할 일
✓ 화장실
□ 택시 승차 위치 확인
□ 기사에게 목적지 확인
```

GPS가 연결되면:

```text
계획 위치
니부노역

현재 위치
계획 위치에서 130m

정상 진행
```

또는:

```text
현재 일정 대비
18분 지연

다음 예약
12:00

예상 도착
12:11

일정 조정 필요
```

---

## 32. Simulation

Simulation은 PlanVersion + Scenario + Route + Constraint를 사용한다.

```text
Normal
Rain
Budget
+10 min all transport
Restaurant wait +30min
Train delay +15min
```

Simulation에서 OptionGroup의 선택이 달라질 수 있지만 실제 PlanVersion을 즉시 변경하지 않는다.

먼저 Preview로 계산해야 한다.

---

## 33. Plan 변경 Preview

Plan B를 누르는 즉시 실제 데이터를 변경하지 않는다.

먼저 영향도를 보여준다.

예:

```text
Smile Hotel
        ↓
Hotel Resol

비용
¥18,000 → ¥23,600
+¥5,600

9/28 체크인 예상
16:20 → 16:12

9/29 아라시야마 이동
47분 → 52분

예약
- 기존 숙소 예약 취소 필요
- 신규 숙소 예약 필요
```

사용자가 적용하면 `OptionGroup.selectedOptionId`가 변경된다.

---

## 34. Plan 변경 시 영향을 받는 View

Option 변경 후 다음은 자동 갱신되어야 한다.

- Timeline
- Map
- Cost
- Booking
- Checklist
- LIVE
- Simulation

View별 데이터를 별도로 수정해서는 안 된다.

---

## 35. View는 Entity Graph를 탐색하는 인터페이스

예:

```text
Cost
↓
숙박
↓
Smile Hotel

[예약 보기]
[지도에서 보기]
[일정에서 보기]
[다른 숙소 후보]
```

`다른 숙소 후보`:

```text
Smile Hotel
↓
OptionGroup
↓
Hotel Resol
```

Map:

```text
Hotel Resol
↓
Place
↓
Route
```

하나의 Entity Graph를 서로 다른 메뉴에서 탐색하는 구조다.

---

## 36. ViewDefinition (향후)

사용자가 View 자체를 저장할 수 있도록 확장 가능하다.

```ts
interface ViewDefinition {
  id: string;

  domain:
    | "cost"
    | "planItem"
    | "booking"
    | "place";

  filters: FilterDefinition[];

  groupBy: string[];

  sortBy: SortDefinition[];

  visualization:
    | "list"
    | "table"
    | "timeline"
    | "summary"
    | "chart";
}
```

예:

```text
"교토에서 쓰는 식비만"

domain = cost
city = Kyoto
category = food
groupBy = date
```

---

## 37. 메뉴와 중심 데이터

| 메뉴 | 중심 객체 |
|---|---|
| Home | TravelProject |
| Trips | TravelProject |
| Timeline | PlanItem |
| Map | PlanItem + Place + Route |
| Plans | OptionGroup + PlanFragment |
| Booking | Booking + BookingPolicy |
| Cost | CostRecord + PlanItem |
| Checklist | Task |
| Simulation | Scenario + Constraint + OptionGroup |
| Live | TripRun + ItemExecution |
| Journal | ItemExecution + Actual Cost |
| Explore | Public TravelProject / PlanVersion |
| Saved Places | Place + Collection |

---

## 38. 원본 데이터와 Derived Data

가능하면 계산 가능한 값은 저장하지 않는다.

예:

```text
숙박 총액
하루 평균 비용
도시별 총 지출
카테고리별 총 지출
```

은 CostRecord로부터 계산한다.

```text
2박
```

역시 체크인/체크아웃 날짜로 계산 가능하다.

### 원칙

> 쉽게 계산 가능한 값은 Derived Data로 두고, 사용자가 입력했거나 외부 서비스가 제공한 원본 데이터만 저장한다.

이를 통해 데이터 불일치를 줄인다.

---

## 39. 정규화 권장

초기 프론트 JSON/localStorage 구현에서도 데이터는 가능한 정규화한다.

권장:

```ts
const store = {
  workspaces: {},
  projects: {},
  planVersions: {},

  planItems: {},
  places: {},
  routes: {},

  bookings: {},
  costRecords: {},
  tasks: {},

  planFragments: {},
  planOptions: {},
  optionGroups: {},
  scenarios: {},
  constraints: {},

  tripRuns: {},
  itemExecutions: {}
};
```

비추천:

```ts
trip.days[0]
  .activities[2]
  .booking
  .cost
  .tasks
  .alternatives
```

깊은 중첩 구조는 추후 공유, 후보 변경, 버전 관리, 관계 조회가 어려워진다.

---

## 40. 관계 데이터 처리

논리적으로는 다음과 같이 생각한다.

```text
PlanItem ↔ Booking
PlanItem ↔ CostRecord
PlanItem ↔ Route
PlanItem ↔ Task
PlanItem ↔ Constraint
```

프론트에서는 Selector를 사용할 수 있다.

```ts
getBookingsForPlanItem(planItemId)
getCostsForPlanItem(planItemId)
getRoutesForPlanItem(planItemId)
getTasksForPlanItem(planItemId)
```

---

## 41. Generic EntityRef 남용 주의

다음처럼 모든 관계를 하나로 표현할 수 있다.

```ts
interface EntityRef {
  type: string;
  id: string;
}
```

하지만 지나치게 사용하면 타입 안정성과 데이터 무결성이 떨어진다.

가능하면 TypeScript에서는 명시적인 타입을 사용한다.

```ts
type PlanItemRef = {
  type: "planItem";
  id: string;
};

type BookingRef = {
  type: "booking";
  id: string;
};
```

백엔드 DB에서도 핵심 관계는 실제 FK 또는 Relation Table을 권장한다.

---

## 42. 공유/Fork

공개 여행계획은 바로 수정하지 않는다.

```text
Original Project
↓
Fork
↓
My Project
```

Fork 시 `source`를 유지한다.

```ts
source: {
  type: "fork",
  projectId: "...",
  planVersionId: "..."
}
```

예약번호, 실제 결제 정보 등 개인 데이터는 공개 PlanVersion과 분리해야 한다.

---

## 43. Template

Template과 실제 TravelProject를 분리한다.

```text
Template
"교토 1일 핵심 코스"

Day 1
07:30 후시미이나리
09:30 도후쿠지
12:00 점심
```

사용자가 시작 날짜를 정하면 실제 TravelProject/PlanVersion으로 생성한다.

---

## 44. 확장 가능한 주요 기능

현재 모델은 다음 확장을 고려한다.

- 공동 편집
- 실시간 공유
- 공개 여행계획 검색
- Fork
- 템플릿
- 일정 자동 최적화
- 비용 최소 Plan
- 날씨 기반 대체 Plan
- 교통 지연 대응
- LIVE 진행
- GPS 기반 지연 감지
- 여행 후 실제 비용 분석
- 계획 vs 실제 비교
- 여행기/Journal
- 사용자 정의 View
- 자동 Simulation 영상 생성

---

## 45. 구현 불변조건(Invariants)

에이전트는 다음 규칙을 가능한 한 깨지 않아야 한다.

### 45.1 PlanItem은 의미 단위다

날짜별 View를 만들기 위해 하나의 숙박 PlanItem을 날짜별 PlanItem 여러 개로 쪼개지 않는다.

### 45.2 Place와 PlanItem은 다르다

장소 자체와 특정 여행에서 그 장소를 방문/숙박하는 것은 별개다.

### 45.3 BookingPolicy와 Booking은 다르다

예약 가능/필요 여부는 속성이고 실제 예약 기록은 Entity다.

### 45.4 Cost 총액과 Breakdown은 별도 PlanItem이 아니다

일별 숙박 가격은 CostBreakdown이다.

### 45.5 View별 중복 데이터를 만들지 않는다

Timeline, Cost, Map 등이 각각 동일 정보를 따로 저장하지 않는다.

### 45.6 Plan과 실제 실행 기록을 분리한다

TripRun 결과로 원본 PlanItem Schedule을 덮어쓰지 않는다.

### 45.7 Alternative는 OptionGroup으로 관리한다

Plan A/B/C를 PlanItem 내부의 단순 문자열 속성으로 처리하지 않는다.

### 45.8 Scenario와 Option을 구분한다

Scenario는 가정 조건이고 Option은 선택 가능한 계획이다.

### 45.9 계산 가능한 집계값은 Derived Data로 유지한다

총 비용, 도시별 비용, 평균 숙박비 등은 가능한 한 원본으로부터 계산한다.

### 45.10 Plan 변경은 Preview 후 Commit

다른 숙소/식당/일정으로 변경할 때 관련 영향도를 계산하고 사용자에게 보여준 뒤 적용한다.

---

## 46. 예시: 교토 숙소

### PlanItem

```text
Smile Hotel Kyoto Shijo
type = lodging
city = Kyoto
period = 9/28~9/30
```

### Place

```text
Smile Hotel Kyoto Shijo
Kyoto
lat/lng
address
```

### CostRecord

```text
total = ¥18,000

breakdown:
9/28 = ¥8,000
9/29 = ¥10,000
```

### BookingPolicy

```text
available
required
```

### Booking

```text
provider = Agoda
status = confirmed
confirmationCode = ...
```

### OptionGroup

```text
교토 숙소

A = Smile Hotel
B = Hotel Resol
C = Sotetsu Fresa
```

이 모든 정보는 서로 연결되어 있지만 하나의 거대한 객체에 깊게 중첩하지 않는다.

---

## 47. 예시: 비용 메뉴에서 숙소 변경

사용자 흐름:

```text
Cost
↓
숙박
↓
Smile Hotel Kyoto Shijo
↓
다른 숙소 후보
↓
Hotel Resol
↓
변경 영향 Preview
↓
적용
```

Preview:

```text
현재
Smile Hotel
¥18,000

변경
Hotel Resol
¥23,600

비용
+¥5,600

이동
9/29 아침 +5분

예약
기존 예약 취소 필요
신규 예약 필요
```

Commit 이후:

```text
OptionGroup.selectedOptionId 변경
```

그리고 자동으로 다음 View가 변경된다.

```text
Timeline
Map
Cost
Booking
Checklist
Live
Simulation
```

---

## 48. React 애플리케이션 구현 권장 구조

예시:

```text
src/
├─ domain/
│  ├─ project/
│  ├─ plan/
│  ├─ place/
│  ├─ booking/
│  ├─ cost/
│  ├─ route/
│  ├─ task/
│  ├─ simulation/
│  └─ run/
│
├─ store/
│  ├─ entities/
│  ├─ selectors/
│  └─ actions/
│
├─ features/
│  ├─ trips/
│  ├─ timeline/
│  ├─ map/
│  ├─ plans/
│  ├─ booking/
│  ├─ cost/
│  ├─ checklist/
│  ├─ simulation/
│  └─ live/
│
└─ pages/
```

UI feature와 Domain 모델을 분리한다.

---

## 49. 상태 변경은 Action/Command 중심 권장

UI 컴포넌트가 여러 Entity를 직접 수정하지 않도록 한다.

예:

```ts
changeSelectedOption(optionGroupId, optionId)

confirmBooking(bookingId)

recordActualCost(planItemId, cost)

completePlanItem(planItemId)

applyScenario(scenarioId)
```

예를 들어 숙소 변경은:

```text
Cost UI
↓
changeSelectedOption(...)
↓
Domain Action
↓
관련 Selector 재계산
↓
모든 View 갱신
```

구조로 처리한다.

---

## 50. 다음 설계 단계

이 문서를 기준으로 다음 순서를 권장한다.

### Phase 1 — Domain types

- TypeScript 타입 정의
- ID 타입
- Entity 관계
- Store normalization

### Phase 2 — Selectors

- 날짜별 PlanItem
- 비용 집계
- 도시별 집계
- 현재 선택된 Option
- Booking 필요/미완료
- LIVE 현재/다음 PlanItem

### Phase 3 — Commands

- Option 변경
- Booking 생성/취소
- Cost 기록
- Task 완료
- TripRun 시작
- ItemExecution 완료

### Phase 4 — UI Views

- Trips
- Overview
- Timeline
- Map
- Plans
- Booking
- Cost
- Checklist
- Simulation
- Live

### Phase 5 — Persistence

초기:

```text
localStorage / JSON
```

이후:

```text
Backend DB
Auth
Cloud Sync
Sharing
Fork
Collaboration
```

---

## 51. 최종 핵심 관계

```text
                Place
                  ↑
                  │
Booking ←── PlanItem ──→ CostRecord
                  │
                  ├──→ Route
                  ├──→ Task
                  └──→ Constraint

PlanItem[]
    ↑
PlanFragment
    ↑
PlanOption
    ↑
OptionGroup

OptionGroup[]
    ↑
Scenario

전체 계획
    ↑
PlanVersion
    ↑
TravelProject
    ↑
Workspace


실제 실행
PlanVersion
    ↓
TripRun
    ↓
ItemExecution
```

---

## 52. 핵심 요약

이 설계에서 가장 중요한 개념은 다음과 같다.

1. **PlanItem이 여행계획의 의미 단위다.**
2. 날짜/도시/카테고리는 부모-자식 계층이 아니라 속성/분석 Dimension이다.
3. Place는 장소 자체이고 PlanItem은 해당 여행에서의 사용이다.
4. 예약 정책과 실제 Booking을 분리한다.
5. 비용은 CostRecord로 독립시키고 세부 가격은 Breakdown으로 표현한다.
6. 후보와 Plan A/B/C는 OptionGroup + PlanFragment 구조로 통일한다.
7. Scenario는 Plan 선택과 별개의 시뮬레이션 조건이다.
8. 계획과 실제 여행 실행은 PlanVersion / TripRun으로 분리한다.
9. 모든 메뉴는 동일한 Entity Graph를 서로 다른 View로 보여준다.
10. View에서 변경한 내용은 공통 원본에 적용되어 모든 메뉴에 반영된다.
11. 공유/Fork/Version을 고려해 데이터는 정규화한다.
12. UI보다 Domain 모델과 관계를 먼저 안정화한다.

이 원칙을 유지하면 기능이 증가하더라도 전체 데이터 모델을 크게 다시 작성하지 않고 확장할 수 있다.
