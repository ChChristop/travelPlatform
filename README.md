# Travel Platform / Kansai Trip Navigator

React + Vite 기반의 여행 계획·실행 플랫폼.

현재는 **Kansai 2026** 여행 데이터를 기반으로 동작하는 여행 내비게이터 형태로 구현되어 있으며,  
향후 여러 여행 프로젝트를 관리하고 예약·비용·대체 일정·시뮬레이션·LIVE 실행·공유/Fork까지 지원하는 구조로 확장 중입니다.

---

## 현재 기본 프로젝트

```text
Kansai 2026
2026-09-26 ~ 2026-10-01

Osaka
→ Nara
→ Kyoto
→ Kobe
```

현재 Kansai 여행은 향후 구조에서 하나의 `TravelProject`로 Migration될 예정입니다.

---

# 현재 구현 기능

- 일본 현지시각 기준 **LIVE 모드**
- 현재 일정 / 다음 일정 / 준비 알림 자동 표시
- 브라우저 GPS 현재 위치 표시
- **SIM 모드**
  - 여행 시간을 가속 재생
  - 60× ~ 3600×
- OpenStreetMap + Leaflet 지도
- 날짜별 동선 / 일정 Pin 표시
- 예약 / 준비 체크리스트
- localStorage 저장
- 모바일 대응
- GitHub Pages 자동 배포 지원

---

# 프로젝트 방향

이 프로젝트는 단순한 여행 일정표가 아니라 다음 흐름을 지원하는 여행 플랫폼을 목표로 합니다.

```text
여행 조사
   ↓
여행 계획
   ↓
Plan A / B / C 비교
   ↓
예약 / 비용 관리
   ↓
Simulation
   ↓
여행 당일 LIVE
   ↓
실제 실행 기록
   ↓
여행 후 분석 / 공유
```

향후 주요 기능:

- 여러 여행 프로젝트 관리
- Workspace
- 여행별 Timeline / Map
- Booking 관리
- 비용 관리
- 숙소 / 식당 / 일정 대체 후보
- Plan A / B / C
- Scenario Simulation
- LIVE 진행
- GPS 기반 지연 감지
- 일정 변경 Preview
- 여행 계획 공유
- 공개 여행 Fork
- Template
- 계획 vs 실제 비교
- 여행 후 Journal

---

# 핵심 데이터 구조

새로운 구조의 핵심은 **PlanItem** 입니다.

예:

```text
Smile Hotel Kyoto Shijo
교토
9/28 ~ 9/30
2박
¥18,000
```

위 정보 전체가 하나의 여행 계획 단위입니다.

다음과 같은 계층으로 저장하지 않습니다.

```text
숙박
└─ 교토
   └─ Smile Hotel
      ├─ 9/28
      └─ 9/29
```

대신:

```text
PlanItem
"Smile Hotel Kyoto Shijo 숙박"

attributes
- type = lodging
- place = Smile Hotel Kyoto Shijo
- city = Kyoto
- start = 2026-09-28
- end = 2026-09-30
```

형태로 관리합니다.

날짜 / 도시 / 카테고리는 Entity 계층이 아니라  
**속성 또는 조회/분석 Dimension** 입니다.

---

# Domain Model

대략적인 목표 구조:

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
     │
     └─ TripRun
          └─ ItemExecution
```

각 메뉴는 별도 데이터를 소유하지 않고 같은 Domain Entity를 서로 다른 View로 보여줍니다.

```text
Timeline
→ PlanItem

Map
→ PlanItem + Place + Route

Bookings
→ Booking + BookingPolicy

Cost
→ CostRecord + PlanItem

Plans
→ OptionGroup + PlanFragment

Simulation
→ Scenario + Constraint

Live
→ TripRun + ItemExecution
```

---

# 예약 구조

예약 관련 정보는 두 개념으로 분리합니다.

## BookingPolicy

해당 PlanItem의 예약 성격.

예:

```text
예약 가능
예약 권장
예약 필수
Walk-in only
예약 불가
```

## Booking

실제로 생성된 예약 기록.

예:

```text
provider
confirmation code
reservation datetime
party size
cancellation deadline
status
```

즉:

```text
PlanItem
├─ bookingPolicy
└─ Booking[]
```

형태입니다.

---

# 비용 구조

비용은 독립적인 `CostRecord`로 관리합니다.

예:

```text
Smile Hotel Kyoto Shijo
9/28 ~ 9/30

총 숙박비
¥18,000
```

날짜별 금액이 있을 경우:

```text
9/28 ¥8,000
9/29 ¥10,000
```

은 별도의 PlanItem이 아니라 `CostBreakdown` 입니다.

비용 화면에서는 동일한 데이터를 여러 방식으로 볼 수 있습니다.

```text
시간순
날짜별
항목별
도시별
계획 / 확정 / 실제
결제 상태별
Plan별
```

---

# 대체 계획

숙소 / 식당 / 관광 / 하루 전체 대체 일정은 모두 같은 구조로 처리합니다.

```text
OptionGroup
"교토 숙소"

Plan A
→ Smile Hotel

Plan B
→ Hotel Resol

Plan C
→ Sotetsu Fresa
```

또는:

```text
OptionGroup
"9/27 오후"

Plan A
→ Himeji

Plan B
→ Osaka
```

Plan 변경 시 즉시 적용하지 않고 먼저 영향도를 계산합니다.

```text
비용 변화
이동시간 변화
예약 영향
Checklist 변화
Timeline 변화
Map Route 변화
```

사용자가 확인하면 실제 Plan에 적용합니다.

---

# LIVE / Simulation

## LIVE

현재 시간과 실제 위치를 기준으로 여행 중 필요한 정보를 보여주는 모드입니다.

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
□ 택시 승차 위치 확인
□ 목적지 확인
```

향후:

```text
현재 일정 대비
18분 지연

다음 예약
12:00

예상 도착
12:11
```

같은 지연 감지도 지원할 예정입니다.

---

## Simulation

여행 전 전체 일정을 시간 흐름에 따라 재생합니다.

지원 목표:

```text
Play
Pause
Speed
Time Scrub
현재 일정
다음 일정
예상 위치
경고
```

Scenario 예:

```text
Normal
Rain
Budget
Transport +10min
Restaurant wait +30min
Train delay +15min
```

향후 Simulation을 Playwright / MediaRecorder / FFmpeg와 연동하여  
실제 여행 앱 사용 영상처럼 자동 녹화하는 기능도 고려합니다.

---

# 기술 스택

현재:

```text
React
Vite
TailwindCSS
Leaflet
OpenStreetMap
localStorage
GitHub Pages
```

향후:

```text
Normalized Domain Store
Versioned Persistence
Backend DB
Auth
Cloud Sync
Sharing
Fork
Collaboration
```

---

# 실행

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

---

# GitHub Pages

1. Repository 생성
2. 프로젝트 Push
3. GitHub Repository에서:

```text
Settings
→ Pages
→ Source
→ GitHub Actions
```

선택

4. `main` Branch Push 시 자동 배포

---

# 지도

현재 지도:

```text
Leaflet
+
OpenStreetMap
```

OpenStreetMap 표준 Tile을 사용합니다.

개인 / 소규모 interactive usage를 전제로 하며 다음은 하지 않습니다.

- 대량 Tile 다운로드
- Offline Tile Prefetch
- Tile Server에 과도한 요청

향후 Route 기능은 무료 Routing Engine을 사용할 수 있습니다.

예:

```text
OSRM
```

단:

```text
도보 / 자동차
→ Routing API

철도
→ 별도 Transit / Schedule Data
```

형태로 분리하는 방향을 권장합니다.

---

# 현재 좌표 데이터

현재 Kansai 초기 데이터 중 일부 장소는 원본 일정에 정확한 주소 / 좌표가 없어  
검색용 `query`만 포함된 항목이 존재할 수 있습니다.

초기 Legacy 구현에서는 다음과 같은 형태가 있을 수 있습니다.

```text
src/data/trip.js
```

다만 이 구조는 **임시 Legacy 구조**입니다.

새로운 기능을 기존 `trip.js` 구조에 강하게 결합하지 마십시오.

향후:

```text
Place
PlanItem
Normalized Store
```

구조로 Migration합니다.

---

# 개발 문서

프로젝트 구현 시 아래 문서를 기준으로 합니다.

```text
docs/
├─ architecture/
│  └─ travel-platform-domain-design.md
│
├─ agent/
│  ├─ CURRENT_ARCHITECTURE.md
│  ├─ CURRENT_TASK.md
│  ├─ HANDOFF.md
│  └─ WORKLOG.md
│
├─ decisions/
│  └─ ADR-xxxx.md
│
├─ IMPLEMENTATION_ROADMAP.md
└─ AGENT_WORKFLOW.md
```

---

## Domain Design

```text
docs/architecture/travel-platform-domain-design.md
```

데이터 모델의 기준 문서.

주요 내용:

- PlanItem
- Place
- BookingPolicy / Booking
- CostRecord / CostBreakdown
- PlanFragment
- OptionGroup
- Scenario
- Constraint
- TripRun
- ItemExecution
- Entity / View 분리 원칙

---

## Implementation Roadmap

```text
docs/IMPLEMENTATION_ROADMAP.md
```

기존 프로젝트를 새 구조로 단계적으로 Migration하기 위한 실행 순서.

주요 Phase:

```text
Phase 0
Repository Audit

Phase 1
Domain Types

Phase 2
Normalized Store

Phase 3
Legacy Migration

Phase 4
Selectors

Phase 5
Multi Project

Phase 6
Timeline / Map Migration

Phase 7
Booking

Phase 8
Cost

Phase 9
Plan Alternatives

Phase 10
Change Preview

Phase 11
Task / Trigger

Phase 12
Constraint

Phase 13
Simulation

Phase 14
TripRun / LIVE

Phase 15
Persistence Versioning

Phase 16
Share / Fork Ready
```

---

## Agent Workflow

```text
docs/AGENT_WORKFLOW.md
```

Local LLM과 Codex의 역할 분담 기준.

기본 역할:

```text
Local Qwen3.8-27B
→ Primary Implementer

Codex
→ Planner / Reviewer / Verifier
```

Local LLM Endpoint:

```text
61.109.169.118:8503
```

OpenAI-compatible API인 경우 예:

```text
http://61.109.169.118:8503/v1
```

실제 Model ID는 실행 시 `/v1/models` 결과를 사용합니다.

OpenCode를 Local Agent Runner로 사용하는 것을 권장합니다.

---

# Agent 작업 흐름

권장 흐름:

```text
Codex
↓
CURRENT_TASK.md

Local Qwen
↓
구현

Local Qwen
↓
build / lint / test

Local Qwen
↓
HANDOFF.md

Codex
↓
HANDOFF 검토

Codex
↓
git diff --stat

Codex
↓
핵심 Diff만 검증

PASS
↓
다음 Phase
```

Codex가 매 작업마다 전체 Repository를 다시 읽지 않도록 합니다.

---

# 디자인 보존 원칙

현재 프로젝트에서 사용자가 직접 수정한 디자인이 **기준 UI**입니다.

Domain Refactor를 이유로 다음을 불필요하게 변경하지 않습니다.

- Layout
- Tailwind class
- Color
- Typography
- Spacing
- Responsive behavior
- Map layout
- Menu design
- Animation

새로운 Domain 구조는 가능한 다음 Layer를 통해 기존 UI에 연결합니다.

```text
Domain
↓
Store
↓
Selector
↓
ViewModel
↓
Existing UI
```

---

# 개발 핵심 불변조건

다음 규칙은 가급적 깨지 않아야 합니다.

1. PlanItem은 여행계획의 의미 단위다.
2. 날짜별 View를 위해 PlanItem을 복제하지 않는다.
3. Place와 PlanItem은 다른 Entity다.
4. BookingPolicy와 실제 Booking을 분리한다.
5. CostBreakdown을 별도 PlanItem으로 만들지 않는다.
6. Plan A/B/C는 OptionGroup으로 관리한다.
7. Scenario와 Option을 구분한다.
8. 계획과 실제 여행 실행 기록을 분리한다.
9. View마다 같은 데이터를 중복 저장하지 않는다.
10. 계산 가능한 집계값은 가능한 Derived Data로 유지한다.
11. Plan 변경은 Preview 후 Commit한다.
12. 기존 UI 디자인을 Domain Refactor 때문에 재작성하지 않는다.

---

# 현재 개발 우선순위

```text
1. Repository Audit

2. Domain Types

3. Normalized Store

4. Legacy Migration

5. Selectors

6. Multi Project

7. Timeline / Map Migration

8. Booking

9. Cost

10. Plan Alternatives

11. Change Preview

12. Task / Constraint

13. Simulation

14. LIVE

15. Persistence

16. Share / Fork
```

Simulation / LIVE / Sharing을 새 Domain 구조보다 먼저 크게 확장하지 않는 것을 권장합니다.

---

# 장기 목표

최종적으로 다음 흐름을 자연스럽게 연결하는 것을 목표로 합니다.

```text
여행 선택
↓
계획
↓
비용 / 예약 / 후보 비교
↓
Plan 변경
↓
Simulation
↓
LIVE
↓
실제 여행
↓
계획 vs 실제 분석
↓
공유 / Fork
```

즉 이 프로젝트는 단순한 **Trip Planner**가 아니라,

> 여행을 설계하고, 비교하고, 시뮬레이션하고, 실제 여행 중 실행하는 플랫폼

으로 확장하는 것을 목표로 합니다.
