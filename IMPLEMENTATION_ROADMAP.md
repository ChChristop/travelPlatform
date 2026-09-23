# Travel Platform — Incremental Implementation Roadmap

> 현재 재구축의 실행 순서와 기존 UI 연결 전략은 [Domain 우선 실행 명세](docs/EXECUTION_SPEC.md)를 우선합니다. 아래 원문은 이전 계획의 이력으로 보존합니다.

> 목적: 현재 디자인이 크게 수정된 기존 React 프로젝트를 보존하면서, `travel-platform-domain-design.md`의 도메인 구조를 단계적으로 적용한다.  
> 구현 주체: Local Qwen3.8-27B 중심  
> 감독/검증: Codex 중심  
> 원칙: 한 번에 전체 리팩터링하지 않는다. 각 단계는 독립적으로 검증 가능해야 하며, UI 디자인 회귀를 최소화한다.

---

## 0. 최우선 원칙

### 0.1 현재 UI/디자인은 기준선(Baseline)이다

현재 프로젝트에서 사용자가 수정한 디자인은 가능한 한 유지한다.

다음은 **명시적인 작업 목적이 없는 한 변경 금지**다.

- 전체 레이아웃 구조
- Tailwind class 구성
- 색상
- typography
- spacing
- 카드 형태
- 반응형 동작
- 지도 배치
- 메뉴 디자인
- icon 구성
- animation

도메인 리팩터링 때문에 UI를 다시 작성하지 않는다.

필요하면 기존 Component가 새로운 Selector/ViewModel을 받아 렌더링하도록 Adapter를 둔다.

---

### 0.2 데이터 구조와 UI 구조를 분리한다

이번 작업의 우선순위는 다음 순서다.

```text
Domain Model
    ↓
Normalized Store
    ↓
Selector / ViewModel
    ↓
Command / Action
    ↓
Existing UI
```

UI Component가 직접 Entity 관계를 계산하지 않게 한다.

---

### 0.3 구현 기준 문서

도메인 규칙의 기준은 다음 문서다.

```text
travel-platform-domain-design.md
```

이 문서와 구현이 충돌하면 임의로 해석하지 말고 다음 순서를 따른다.

1. 기존 UI 동작 보존 가능 여부 확인
2. Domain Design의 Invariant 확인
3. 기존 데이터와 호환되는 Adapter 설계
4. 필요한 경우 `docs/decisions/ADR-xxxx.md` 작성
5. 그 후 구현

---

# 1. 목표 아키텍처

최종적으로 프로젝트는 아래 흐름을 갖는다.

```text
Workspace
  └─ TravelProject
      └─ PlanVersion
          ├─ PlanItem
          ├─ PlanFragment
          ├─ OptionGroup
          ├─ Scenario
          └─ Constraint

PlanItem
  ↔ Place
  ↔ Booking
  ↔ CostRecord
  ↔ Route
  ↔ Task

PlanVersion
  ↓
TripRun
  ↓
ItemExecution
```

화면은 이 데이터를 서로 다른 View로 본다.

```text
Home / Trips
Timeline
Map
Plans
Bookings
Costs
Checklist
Simulation
Live
```

---

# 2. 변경 전략

## 2.1 Big Bang Migration 금지

기존 데이터를 삭제하고 새로운 데이터 구조로 한 번에 교체하지 않는다.

다음 패턴을 사용한다.

```text
Legacy Data
    ↓
Migration Adapter
    ↓
New Domain Model
    ↓
Selector
    ↓
Existing UI
```

새 구조가 충분히 안정화된 이후 Legacy 구조를 제거한다.

---

## 2.2 모든 Phase는 독립 Commit

권장 Branch:

```text
refactor/domain-model
```

Phase별 Commit 예:

```text
refactor: add normalized domain entities
refactor: add legacy trip migration adapter
feat: add workspace and project selection
feat: add cost records and cost views
feat: add plan alternatives
```

여러 Phase를 하나의 Commit에 섞지 않는다.

---

# 3. Phase 0 — Repository Audit / Baseline

## 목적

현재 사용자가 수정한 디자인과 기존 동작을 정확히 보존하기 위한 기준선 확보.

## 작업

Local Agent가 먼저 Repository를 분석한다.

확인 항목:

```text
package.json
src/
router
state/store
trip data
map implementation
simulation implementation
live implementation
localStorage usage
Tailwind structure
```

특히 다음을 문서화한다.

```text
docs/agent/CURRENT_ARCHITECTURE.md
```

필수 내용:

- 현재 페이지/Route 목록
- 주요 Component 관계
- 여행 데이터 위치
- 현재 데이터 schema
- localStorage key
- Leaflet/지도 코드 위치
- LIVE/SIM 관련 코드 위치
- 수정하면 디자인 회귀 위험이 큰 Component
- 현재 build/test/lint 명령어

## 검증

반드시 실행:

```bash
npm install
npm run build
```

가능한 경우:

```bash
npm run lint
npm test
```

## 완료 조건

- 현재 build 성공
- 기존 기능 목록 확보
- `CURRENT_ARCHITECTURE.md` 생성
- 변경 전 Git commit 확보

---

# 4. Phase 1 — Domain Types 도입

## 목적

UI 변경 없이 새로운 Domain Type을 프로젝트에 추가한다.

## 권장 디렉터리

```text
src/domain/
├─ ids.ts
├─ money.ts
├─ workspace.ts
├─ project.ts
├─ plan.ts
├─ place.ts
├─ booking.ts
├─ cost.ts
├─ route.ts
├─ task.ts
├─ scenario.ts
└─ run.ts
```

JavaScript 프로젝트라면 JSDoc typedef 또는 TypeScript 전환 전략을 선택할 수 있다.

가능하면 Domain부터 TypeScript 사용을 권장한다.

## 이 Phase에서 구현할 객체

```text
Workspace
TravelProject
PlanVersion
PlanItem
Place
BookingPolicy
Booking
CostRecord
CostBreakdown
PlanFragment
PlanOption
OptionGroup
Scenario
Constraint
Route
Task
TripRun
ItemExecution
```

## 금지

- 기존 UI Component 수정
- 기존 데이터 삭제
- 기존 Timeline/Map 재작성

## 검증

Domain Type compile 또는 static check 성공.

---

# 5. Phase 2 — Normalized Store 추가

## 목적

모든 Entity를 ID 기반으로 관리할 Store를 추가한다.

예:

```ts
interface EntityState {
  workspaces: Record<string, Workspace>;
  projects: Record<string, TravelProject>;
  planVersions: Record<string, PlanVersion>;

  planItems: Record<string, PlanItem>;
  places: Record<string, Place>;

  bookings: Record<string, Booking>;
  costRecords: Record<string, CostRecord>;
  routes: Record<string, Route>;
  tasks: Record<string, Task>;

  planFragments: Record<string, PlanFragment>;
  planOptions: Record<string, PlanOption>;
  optionGroups: Record<string, OptionGroup>;
  scenarios: Record<string, Scenario>;
  constraints: Record<string, Constraint>;

  tripRuns: Record<string, TripRun>;
  itemExecutions: Record<string, ItemExecution>;
}
```

Zustand 사용 시 Store를 UI state와 Domain state로 분리한다.

예:

```text
domainStore
uiStore
liveStore
```

## 중요한 규칙

다음처럼 깊게 중첩하지 않는다.

```text
project.days[x].items[x].booking.cost...
```

Entity ID 참조 구조를 사용한다.

---

# 6. Phase 3 — Legacy → Domain Migration Adapter

## 목적

현재 간사이 여행 데이터를 새 구조로 변환하되 기존 UI는 그대로 유지한다.

권장 파일:

```text
src/domain/migrations/
├─ legacyTripToDomain.ts
└─ domainToLegacyView.ts   # 임시 필요 시
```

흐름:

```text
현재 tripData
   ↓
legacyTripToDomain()
   ↓
Normalized Domain State
```

필수 검증:

- 날짜 수 동일
- PlanItem 수 예상 범위
- 장소 이름 손실 없음
- 시간 손실 없음
- 현재 지도 marker 수 유지
- LIVE/SIM에서 사용하는 핵심 timestamp 유지

## 완료 조건

새 Store로 데이터를 로드할 수 있지만 UI 결과가 이전과 동일해야 한다.

---

# 7. Phase 4 — Selector / ViewModel Layer

## 목적

UI가 직접 Normalized Entity를 조립하지 않게 한다.

권장:

```text
src/domain/selectors/
├─ projectSelectors.ts
├─ timelineSelectors.ts
├─ mapSelectors.ts
├─ bookingSelectors.ts
├─ costSelectors.ts
├─ planSelectors.ts
├─ liveSelectors.ts
└─ simulationSelectors.ts
```

예:

```ts
getPlanItemsForDate(projectId, date)
getSelectedPlanItems(planVersionId)
getBookingsForPlanItem(planItemId)
getCostsForPlanItem(planItemId)
getTimelineViewModel(date)
getMapViewModel(date)
getCurrentAndNextPlanItem(now)
```

UI는 가능하면 ViewModel만 받는다.

---

# 8. Phase 5 — Multi Project / Workspace

## 목적

현재 단일 여행 전용 구조를 여러 여행을 선택할 수 있는 구조로 확장한다.

## 추가 화면

```text
Home
Trips
```

Trip Card 정보:

```text
title
date range
status
cover
preparation progress
next important item
```

상태:

```text
research
planning
ready
active
completed
archived
```

현재 간사이 여행은 하나의 `TravelProject`로 migration한다.

## URL 권장

```text
/trips
/trips/:projectId
/trips/:projectId/timeline
/trips/:projectId/map
/trips/:projectId/live
```

---

# 9. Phase 6 — PlanItem 기반 Timeline / Map 전환

## 목적

기존 UI 디자인을 그대로 유지하면서 데이터 source를 새로운 Selector로 교체한다.

진행 순서:

```text
Timeline
→ 새 Selector 연결
→ UI 동일성 확인

Map
→ 새 Selector 연결
→ Marker / Route 확인
```

기존 디자인 markup을 가능한 한 유지한다.

## 완료 조건

Legacy data 직접 접근 제거.

---

# 10. Phase 7 — Booking

## 구현

### BookingPolicy

PlanItem 속성:

```text
available / notAvailable / unknown
required / recommended / optional / walkInOnly
```

### Booking Entity

실제 예약 기록.

상태:

```text
draft
requested
confirmed
cancelled
completed
failed
```

## Booking View

필터 예:

```text
예약 필요
예약 요청
확정
취소
미예약
```

## 중요

`예약 필요 여부`와 `실제 Booking`을 합치지 않는다.

---

# 11. Phase 8 — Cost Model / Cost Views

## 구현 객체

```text
CostRecord
CostBreakdown
PaymentInfo
```

### Cost Type

```text
estimate
committed
actual
refund
```

### Category

```text
lodging
food
transport
attraction
shopping
other
```

## 기본 View

```text
시간순
날짜별
항목별
도시별
계획/확정/실제
결제 상태
```

### 중요

숙박 개체 예:

```text
Smile Hotel Kyoto Shijo
교토
9/28~9/30
¥18,000
```

이것은 하나의 PlanItem이다.

일별 가격이 있다면:

```text
9/28 ¥8,000
9/29 ¥10,000
```

은 `CostBreakdown`이다.

별도 PlanItem으로 쪼개지 않는다.

---

# 12. Phase 9 — Plan Alternatives

## 구현 객체

```text
PlanFragment
PlanOption
OptionGroup
```

동일 엔진으로 처리:

```text
숙소 후보
식당 후보
관광 후보
Plan A/B/C
하루 전체 대체 Plan
```

예:

```text
OptionGroup: 교토 숙소

A → Smile Hotel Fragment
B → Hotel Resol Fragment
C → Sotetsu Fresa Fragment
```

---

# 13. Phase 10 — Change Preview / Commit

## 목적

Option을 누르는 즉시 계획을 변경하지 않는다.

### Preview 단계

계산:

```text
비용 변화
이동시간 변화
예약 영향
Task 변화
Timeline 영향
Map Route 영향
```

예:

```text
Smile Hotel
→ Hotel Resol

비용 +¥5,600
9/29 이동 +5분

기존 예약 취소 필요
신규 예약 필요
```

### Commit

사용자 확인 후:

```text
selectedOptionId 변경
```

모든 View는 Selector를 통해 자동 갱신된다.

---

# 14. Phase 11 — Task / Trigger

## Task

체크리스트와 LIVE 준비사항을 하나의 모델로 통합한다.

Trigger:

```text
absoluteTime
beforePlanItem
afterPlanItem
enterPlace
```

예:

```text
아부리야 30분 전
→ 예약 화면 준비

도후쿠지 완료
→ 캐리어 회수
```

---

# 15. Phase 12 — Constraint

일정 최적화와 Simulation을 위해 추가.

```text
fixedTime
timeWindow
minDuration
maxDuration
mustBefore
mustAfter
openingHours
reservation
budget
weather
distance
```

hard / soft 구분.

---

# 16. Phase 13 — Scenario / Simulation

Scenario는 Option과 분리한다.

예:

```text
Normal
Rain
Budget
Fatigue
Transport +10m
Restaurant wait +30m
```

Simulation은 실제 Plan을 변경하지 않고 Preview state에서 실행한다.

지원 목표:

```text
Play
Pause
Speed
Scrub time
Current item
Next item
Current expected position
Warnings
```

향후 자동 영상 녹화 가능하도록 deterministic simulation을 유지한다.

---

# 17. Phase 14 — TripRun / LIVE

실제 여행 시작 시:

```text
TripRun
```

생성.

PlanVersion snapshot을 참조한다.

ItemExecution에 실제 기록 저장:

```text
actualStart
actualEnd
completed
skipped
```

원래 PlanItem schedule은 변경하지 않는다.

LIVE Selector:

```text
현재 PlanItem
다음 PlanItem
남은 시간
현재 예상 위치
GPS 위치
지연 시간
준비 Task
```

---

# 18. Phase 15 — Persistence Versioning

localStorage schema에 버전을 둔다.

예:

```ts
{
  schemaVersion: 2,
  data: {...}
}
```

Migration:

```text
v1 → v2
v2 → v3
```

기존 사용자 데이터 삭제 금지.

## 추가 권장

```text
Export JSON
Import JSON
Reset Demo Data
```

공유/Backend 이전에도 백업이 가능해야 한다.

---

# 19. Phase 16 — Share/Fork Ready Boundary

이 Phase에서는 Backend를 꼭 구현하지 않아도 된다.

먼저 Domain을 공개 데이터와 개인 데이터로 분리한다.

### 공유 가능

```text
PlanVersion
PlanItem
Place
Route
selected public costs
notes
```

### 기본 비공개

```text
confirmationCode
private Booking details
payment method
actual payment data
personal notes
GPS history
```

Fork metadata도 준비한다.

---

# 20. 테스트 전략

## Domain Unit Test

최우선.

예:

```text
legacy migration
cost aggregation
cost breakdown
selected option resolution
scenario override
current/next item calculation
delay calculation
```

## Selector Test

같은 Entity State에서 올바른 ViewModel이 생성되는지 확인.

## Command Test

예:

```text
changeSelectedOption
confirmBooking
recordActualCost
completeTask
startTripRun
completePlanItem
```

## UI Test

핵심 Flow 위주.

가능하면 Playwright:

```text
Trips → Kansai
Timeline
Cost
숙소 상세
Plan B preview
Apply
Timeline/Map/Cost 갱신
```

---

# 21. 디자인 회귀 방지

각 Phase에서 UI 변경이 발생하면 다음을 비교한다.

```text
Desktop
Mobile
Dark/Light (지원 시)
```

권장:

- Playwright screenshot
- 핵심 페이지 스크린샷 저장
- CSS/Tailwind 변경 최소화

Domain 변경 PR에서 불필요한 디자인 수정은 Reject 대상이다.

---

# 22. 작업 완료 정의(Definition of Done)

각 Phase 완료 시 다음을 모두 만족해야 한다.

- [ ] Scope 외 파일 변경 최소화
- [ ] build 성공
- [ ] lint 성공(설정된 경우)
- [ ] 관련 unit test 성공
- [ ] 기존 UI 디자인 회귀 없음
- [ ] 기존 데이터 손실 없음
- [ ] 새로운 Domain invariant 위반 없음
- [ ] `docs/agent/HANDOFF.md` 갱신
- [ ] 변경 내용과 남은 문제 기록
- [ ] 하나의 명확한 Git commit 생성

---

# 23. 구현 우선순위 요약

```text
P0
Repository Audit

P1
Domain Types
Normalized Store
Legacy Migration

P2
Selectors
Multi Project
Timeline / Map migration

P3
Booking
Cost
OptionGroup

P4
Change Preview
Task
Constraint

P5
Scenario / Simulation
TripRun / LIVE

P6
Persistence Migration
Share/Fork boundary
```

이 순서를 가능한 한 유지한다.

특히 `Simulation`, `LIVE`, `Sharing`을 Domain/Selector 이전에 먼저 확장하지 않는다.
