# R6 — 예약 / 비용 / Task / 대안 변경

## 1. 개요
- **상태**: R5 완료 (PASS). R5 작업은 `sessions/HANDOFF`에 기록되어 있으며, 본 문서는 R6 실행을 위한 최신 작업 지시서입니다.
- **목표**: `BookingPolicy`와 `Booking`의 개념 분리, 비용(`estimate/committed/actual/refund`) 및 `Breakdown` 집계, `Task` 상태 유지, 그리고 `OptionGroup`/`PlanFragment` 변경 시 `preview` 기반 영향 분석 후 명시적 `commit` 처리 구현.
- **핵심 원칙**:
  - `preview`는 임시 상태이며, `cancel` 시 원본 state는 불변(immutable)을 유지해야 합니다.
  - `commit` 시 stale-preview guard 적용.
  - 순수 함수(Pure Function) 기반 Command 패턴으로 상태 변경을 처리하며, 입력 객체를 절대 변형하지 않습니다.

## 2. 소유권 및 세션 구성 (Strict Ownership)

R6는 **3개의 순차적 로컬 세션(A, B, C)**으로 구성됩니다. 각 세션은 지정된 파일만 작성/수정할 수 있으며, 다른 세션의 파일이나 기존 사용자 변경 파일은 읽기 전용으로만 접근할 수 있습니다.

### ⚠️ 보존 대상 (Preserve Exactly)
다음 파일들은 **절대 수정 금지**입니다. R6 세션들은 이 파일들을 읽기만 할 수 있습니다.
- `AGENTS.md`, `AGENT_WORKFLOW.md`, `IMPLEMENTATION_ROADMAP.md`, `README.md`
- `docs/EXECUTION_SPEC.md`, `docs/agent/RUNNER_GUIDE.md`
- `src/App.jsx`, `src/components/MapPanel.jsx`, `src/mapTracking.js`, `tests/mapTracking.test.js`

---

### Session A: Commands & Tests (Core Logic)
**역할**: 순수 로직 및 테스트 구현.
**소유 파일 (Write/Modify)**:
- `src/store/commands/option.ts`
- `src/store/commands/booking.ts`
- `src/store/commands/cost.ts`
- `src/store/commands/task.ts`
- `src/store/commands/index.ts`
- `tests/commands/option.test.ts`
- `tests/commands/booking-cost-task.test.ts`

**허용 읽기 (Read Only)**:
- `src/platform/types.js` (타입 정의 확인용)
- `src/store/` (기존 구조 참고용)

**구현 요구사항**:
1. **BookingPolicy vs Booking 분리**:
   - `BookingPolicy`: 정책/규칙 정의.
   - `Booking`: 실제 예약 인스턴스. 상태(`status`) 업데이트 가능.
   - **공유 Command API**: `updateBookingStatus`, `updateTaskStatus`, `addCostRecord`, `aggregateCosts`, `createOptionGroup`, `deriveActiveState`, `previewOptionChange`, `commitOptionChange`를 `index.ts`에서 명시적으로 export. Session B/C는 실제 exports를 import해야 함.
2. **CostRecord 및 집계**:
   - `CostRecord` 생성: `subject`, `currency`, `total`({amount:number, currency:string}), `type`(`estimate`/`committed`/`actual`/`refund`), `category`, `breakdown`(optional, amounts are Money) 포함.
   - **집계 로직**: 통화(currency) 및 유형(type)별 합계 계산.
   - **Refund 처리**: `refund`는 net total에서 차감.
   - **Breakdown**: 중복 계산(double counting) 방지. Breakdown 항목은 상위 `value`에 이미 포함되어 있으므로 별도 합산 금지.
3. **Task 상태 관리**:
   - `Task` 상태 업데이트 명령어 구현.
4. **OptionGroup / PlanFragment**:
   - 기존 `PlanItems`로부터 `OptionGroup` 생성 (최소 2개 옵션, 명시적 선택).
   - `active item selection`: 미그룹화 항목 + 선택된 Fragment 조합.
   - **Preview Target Option Changes**:
     - 추가/삭제된 `PlanItems`.
     - 매핑된 `Booking`, `Task`, `Cost`, `Timeline/Map` 좌표 변경 사항.
   - **Explicit Commit**: Stale-preview guard 적용 (preview는 baseState 참조를 유지하며, commit 시 current state !== preview.baseState이면 commit 거부. 즉, 중간에 상태가 변경되면 commit 실패).
   - **Cancel**: 상태 변경 없이 preview 폐기 (원본 state 불변).
5. **테스트 요구사항**:
   - 실제 모듈 import.
   - Preview/Cancel 시 불변성 검증.
   - Stale commit 시나리오 검증.
   - Cost/Refund/Breakdown 집계 정확성 검증.
   - Reference 무결성 및 Selected Item 필터링 검증.
   - **금지**: Seed 데이터에 대안(alternative) 데이터를 임의로 생성하지 않음.

**완료 기준**:
- `node --experimental-strip-types --test tests/commands/*.test.ts` (command tests only) 통과.
- TypeScript 타입 체크 통과 (strict type check via `npx tsc` or `tsconfig.commands.json` if locally authored in A).
- 순수 함수 원칙 준수 (Side-effect 없음, `any` 타입 사용 금지).

---

### Session B: Feature UI (Presentation Layer)
**역할**: 기능별 UI 컴포넌트 구현.
**소유 파일 (Write/Modify)**:
- `src/platform/features/booking/*.jsx`, `*.css`
- `src/platform/features/cost/*.jsx`, `*.css`
- `src/platform/features/tasks/*.jsx`, `*.css`
- `src/platform/features/plans/*.jsx`, `*.css`

**허용 읽기 (Read Only)**:
- `src/store/commands/` (Session A에서 생성된 파일)
- `src/platform/types.js`
- `src/platform/PlatformApp.jsx` (구조 참고용, 수정 금지)

**구현 요구사항**:
1. **Booking View**:
   - `BookingPolicy`와 실제 `Booking`을 명확히 구분하여 표시.
   - Booking 상태 업데이트 UI 제공.
2. **Cost View**:
   - 통화별 합계(Totals) 표시.
   - 기록 목록: `type`, `category`, `subject`, `breakdown` 상세 표시.
   - 새 `CostRecord` 생성 UI.
3. **Tasks View**:
   - Task 상태 업데이트 UI.
4. **Plans View**:
   - 기존 항목으로부터 Group 생성 UI.
   - **Preview Impact Display**: Commit/Cancel 전 비용, 예약, Task, Timeline, Map 영향 사항을 미리보기로 표시.
   - 명시적 `Commit` 및 `Cancel` 버튼.
5. **공통 원칙**:
   - 컴포넌트는 `state`와 `callbacks`를 props로만 수신.
   - 로컬 엔티티 복사본(Local Entity Copies) 금지.
   - 가짜 Seed 데이터 사용 금지.
   - 접근성(Accessible) 컨트롤 및 빈 상태(Empty State) 처리 필수.
   - CSS는 기능별로 분리.
   - Session A의 파일 수정 금지.

**완료 기준**:
- UI 컴포넌트 렌더링 오류 없음.
- Preview/Commit/Cancel 플로우가 UI에서 정상 동작.
- 접근성 표준 준수.

---

### Session C: Integration & Shell (Wiring)
**역할**: 애플리케이션 통합, 상태 관리, 내비게이션.
**소유 파일 (Write/Modify)**:
- `src/platform/PlatformApp.jsx`
- `src/platform/Shell.jsx`
- `src/platform/platform.css`
- `src/platform/dataSource.js`
- `src/platform/features/timeline/TimelineView.jsx`
- `src/platform/features/map/MapView.jsx`
- `src/platform/types.js` (필요 시 타입 확장)
- `tests/platform/r6-dataSource.test.ts` (선택 사항)

**허용 읽기 (Read Only)**:
- `src/store/commands/` (Session A)
- `src/platform/features/` (Session B)
- `src/store/` (기존 store 구조)

**구현 요구사항**:
1. **데이터 소스 (dataSource.js)**:
   - Seed 데이터 초기화 (1회).
   - R4 `loadState`를 통해 R6 전용 storage key 로드.
   - **Key Missing vs Corrupt Data 구분**:
     - Key 없음: 기본 Seed 사용.
     - 데이터 손상(Corrupt): 원본 raw 데이터 보존 및 에러 처리 (무시하지 않음).
   - Legacy key 절대 덮어쓰기 금지.
2. **Command Action 처리**:
   - Command 실행 결과(Result) 검증.
   - `setState` **전**에 `saveState` 실행.
   - 저장 실패 시 에러 표시.
3. **공유 상태 (Shared Active State)**:
   - `Timeline`, `Map`, `Booking`, `Cost`, `Tasks` 뷰를 모두 구동하는 단일 활성 상태 관리.
   - **Active Projection**: `selected fragments`로부터 파생된 active state를 `Timeline`, `Map`, `Booking`, `Cost`, `Tasks`에 전달. `Plans`는 raw state를 수신.
   - **Option Switching**: 옵션 변경 시 `Timeline`과 `Map` 투영(Projection)이 시각적으로 변경되어야 함.
4. **Preview 관리**:
   - Preview는 일시적(Ephemeral) 상태.
   - Cancel 시 상태가 원복되어야 함.
5. **내비게이션**:
   - 새로운 뷰(Booking, Cost, Tasks, Plans) 추가.
6. **금지 사항**:
   - Legacy entry point 또는 legacy source 수정 금지.
   - Session A/B 파일 수정 금지.

**완료 기준**:
- 전체 애플리케이션 빌드 성공.
- 상태 저장/로드 로직 정상 동작.
- 옵션 변경 시 Timeline/Map 시각적 반영 확인.
- Preview/Cancel 시 상태 불변성 확인.

---

## 3. 검증 및 완료 기준 (Verification & Completion)

### 3.1 자동화 검증
1. **타겟 검증**: 최종 관련 편집 후 변경된 경로에 해당하는 타입체크/테스트/빌드만 1회 실행한다.
2. **증거 재사용**: 관련 소스 및 테스트 스냅샷이 동일할 경우에만 기존 PASS 결과를 재사용하며, 과거 테스트 개수를 고정하거나 전체 스위트를 반복 실행하는 것은 금지합니다.
3. **R6 기준**: Session A의 Command 테스트 및 Session C의 `r6-dataSource.test.ts`는 최종 편집 후 타겟으로 실행하여 통과를 확인한다.
4. **빌드**: JSX, CSS, dataSource 등 번들 코드의 최종 변경이 완료된 후에만 1회 실행하며, 문서만 변경한 경우 빌드 과정을 생략합니다.

### 3.2 수동 검증 (Browser Access 가능 시)
- UI에서 Booking/Cost/Tasks/Plans 뷰 전환 정상.
- Plans에서 Preview 생성 후 Cancel 시 원본 상태 복원 확인.
- Plans에서 Commit 시 Timeline/Map에 변경 사항 반영 확인.
- Cost에서 Refund 처리 시 Net Total 정확성 확인.

### 3.3 문서화 및 커밋
1. **문서 업데이트 (별도 Documentation Session)**:
   - `HANDOFF.md` (루트) 업데이트.
   - `docs/agent/WORKLOG.md` 업데이트.
   - *주의*: 이 작업은 A/B/C 세션이 아닌, 로컬 LLM이 별도 세션에서 수행.
2. **커밋**:
   - R6 소유 파일만 선택하여 검증한 후 로컬 커밋을 수행하며, 전체 스위트 반복 실행은 하지 않습니다.
   - `git push` 금지.

## 4. 실패 복구 전략 (Failure Recovery)
- **Preview 폐기**: Preview 상태가 일관성을 잃으면 즉시 폐기.
- **Command Transaction 취소**: Command 실행 중 오류 발생 시 마지막 일관된 상태로 롤백.
- **UI 임시 해결 금지**: UI별 복사 데이터(Copy Data)를 사용하여 임시 해결하는 행위 엄격히 금지.

## 5. 불변식 (Invariants)
1. **Pure Commands**: Command 함수는 순수 함수이며, 입력 객체를 변형하지 않는다.
2. **Immutability**: `cancel` 또는 `preview` 폐기 시 원본 state는 절대 변하지 않는다.
3. **No Side Effects**: Command 내부에서 I/O, 네트워크, 로깅 등 사이드 이펙트 금지.
4. **No `any`**: TypeScript `any` 타입 사용 금지.
5. **No New Dependencies**: 새로운 npm 패키지 추가 금지.

## 6. 미해결 한계 (Unresolved Limitations)
- (구현 과정에서 발견된 한계는 이 섹션에 정직하게 기록해야 함)
- 예: 브라우저 접근 불가 시 UI 시각적 검증은 코드 리뷰로 대체.

---
*본 문서는 R6 실행을 위한 최종 지시서입니다. 모든 세션은 이 문서의 소유권 및 검증 기준을 엄격히 준수해야 합니다.*
