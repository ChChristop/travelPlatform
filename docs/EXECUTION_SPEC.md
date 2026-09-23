# Travel Platform — Domain 우선 재구축 실행 명세

상태: 승인된 방향의 실행 기준 / 2026-09-23. 이번 실행 범위는 R1이다.
기존 IMPLEMENTATION_ROADMAP.md의 단계 순서와 기존 UI 재배선 전략보다 이 명세를 우선한다. 원래 roadmap은 이력으로 보존한다. Entity 의미는 루트 travel-platform-domain-design.md, 현재 앱 기준선은 agent/CURRENT_ARCHITECTURE.md, 역할 분담은 루트 AGENT_WORKFLOW.md를 따른다.

## 1. 결정과 경계

기존 Kansai 앱을 작동 가능한 기준선으로 유지하고, 새로운 Domain 데이터 구조를 검증한 후 별도 새 앱을 만든다. 기존 Component 형태에 새 Domain을 강제로 맞추는 장기 호환 Adapter는 기본 전략으로 삼지 않는다. 기존 디자인의 유용한 패턴은 새 화면에서 선택적으로 재사용한다.

- 보존: src/App.jsx, src/components/**, src/data/trip.js, src/main.jsx, src/styles.css 및 현재 진입점. R1에서 앱 import/build 설정을 바꾸지 않는다.
- 추가: src/domain/**의 타입과 독립 타입 검증. 후속 store/migration/UI는 단계별 별도 경로.
- 공존: 향후 platform/index.html과 src/platform/** 같은 별도 진입점을 계획한다. /platform/은 제안 경로이며 현재 구현된 Route가 아니다. GitHub Pages의 repository base 및 직접 진입/새로고침을 검증한다.
- 전환: 신규 화면을 기본으로 바꾸더라도 이전 진입점과 저장 데이터를 삭제하지 않는다. **기존 앱 삭제·폐기는 추후 사용자에게 명시적인 확인을 받은 뒤에만 진행한다.** 새 앱 검증 완료, 기본 entry 변경, Codex PASS는 폐기 승인이 아니다.
- 배포/commit/push는 현재 batch에 포함되지 않는다.

## 2. 데이터의 단일 기준

1. 기존 앱의 원본은 읽기 전용 src/data/trip.js와 기존 trip.todo.done이다.
2. migration은 원본을 읽어 버전 있는 신규 seed와 provenance/미해결 보고서를 만든다. 검증 전에는 앱이나 localStorage에 적용하지 않는다.
3. 검증된 seed로 초기화한 신규 normalized Domain state가 새 앱의 단일 원본이다. Timeline/Map/Cost 등은 Selector의 파생 결과를 사용한다.
4. legacy와 신규 state를 지속적으로 양방향 동기화하지 않는다. 원본 재수입은 명시적인 import/중복 방지 절차를 거친다.
5. 기존 localStorage는 원문 backup 및 신규 namespace/version/import 검증을 확보하기 전 쓰거나 삭제하지 않는다. 손상/알 수 없는 형식도 원문을 보존하고 복구할 수 있게 한다.
6. ID/프로젝트/버전/참조 존재, 날짜/금액/좌표 유효성은 runtime validation으로 확인한다. 타입 검증만으로 무결성을 보장하지 않는다.

## 3. 실행 순서와 완료 Gate

R0 감사 → R1 타입 → R2 정규화/무결성 → R3 migration → R4 Selector/저장 → R5 새 앱 → R6 업무 기능/대안 변경 → R7 SIM → R8 LIVE → R9 전환 검증 → R10 공유 경계.

아래 경로는 R1 이외에는 **예정 경로**다. 실제 착수 시 CURRENT_TASK에서 세부 파일과 검증 명령을 고정한다. 각 batch는 Qwen handoff와 실행 로그를 Codex가 검토하고 PASS 또는 corrective task를 남긴다. 검증 실패 상태로 다음 단계에 진입하지 않는다.

### R0 — 감사 (완료)

입력: 기존 repository. 산출물: agent/CURRENT_ARCHITECTURE.md, WORKLOG의 검증 기록.
기준: 일정 46개, 6일, 좌표 보유 이벤트 40개/누락 6개, todo 8개. 기존 production build 성공.
이 문서는 이후 전체 repository 재탐색을 줄이기 위한 legacy 기준선으로 유지한다.

### R1 — Domain Types (이번 batch)

- 입력: 설계 문서와 ADR-0001, 감사 기준선.
- 산출물: src/domain의 ID/Money/Workspace/Project/PlanItem/Place/Booking/Cost/Route/Task/Option/Scenario/Constraint/Run 타입, index.ts; tsconfig.domain.json; tests/domain/contracts.type-test.ts.
- 완료: strict/noEmit compile, 모든 PlanItem 타입의 정상 예와 type/detail 불일치 거부, Entity ID 혼용·CostSubject·Trigger·예약 정책/기록 혼동 거부, 기존 build 성공.
- 세션: A 핵심 타입, B 연관 타입, C 명세/ADR를 병렬 실행. A/B 후 D가 index/config/package scripts/tests만 통합. 정확한 파일 소유권은 CURRENT_TASK 참조.
- 실패: 실패 타입 담당 세션에 교정; 통합 담당이 다른 세션 소스를 임의 변경하지 않는다. 앱은 신규 코드를 import하지 않아 기존 동작 유지.
- 한계: runtime 데이터 검증이나 migration 완료가 아니다.

### R2 — Normalized state와 runtime 무결성

- 입력/의존: R1 PASS, 타입별 소유 관계.
- 산출물(예정): src/store/entities/**, src/domain/validation/**, tests/domain/runtime/**. entity별 ID map과 순수 state factory, 참조 검사, 구조화된 오류 보고.
- 완료: 중복/누락 ID, 잘못된 소유 프로젝트·버전, dangling ref, 날짜 순서·유효성, 유한 금액/좌표, 선택 option이 그룹에 속하는지 등을 positive/negative fixture로 검증. validate 실패 데이터는 store에 commit하지 않는다.
- 세션 최대 2: A state/validator 구현; B tests/domain/runtime/** 독립 테스트. shared export/config 수정은 A가 B 완료 후 순차 통합.
- 실패 복구: 메모리 candidate 폐기, 기존 state/legacy 유지. persistence 연결 없이 먼저 검증한다.

### R3 — 원문 보존 migration

- 입력/의존: R2 PASS, legacy events/todos 및 사용자가 export한 완료 상태 snapshot. 브라우저 개인 저장값은 코드 기본값과 구분한다.
- 산출물(예정): src/domain/migrations/**, fixtures/migrations/**, tests/migrations/**, docs/migration/KANSAI_REPORT.md. 결과는 신규 seed + legacy ID 대응표 + unresolved/provenance report.
- 완료: 아래 R3 전용 체크리스트 전부 통과. 입력 불변성, 재실행 멱등성, 중복 import 방지, 손상 입력 안전 실패도 테스트한다.
- 세션 최대 2: A migration/provenance 구현; B fixture/test/report 검증. report 출력 포맷 계약을 먼저 고정하고 A가 실행 결과를 생성, B는 검증 문서만 쓴다.
- 실패 복구: 신규 결과를 적용하지 않고 legacy/backup 보존. 불확실한 사실은 unresolved로 남겨 검토 가능하게 하며 데이터 날조로 테스트를 통과시키지 않는다.

### R4 — Selector와 안전한 저장

- 입력/의존: R3 검증된 seed와 보고서.
- 산출물(예정): src/store/selectors/**, src/persistence/**, tests/selectors/**, tests/persistence/**. 날짜/도시/타입 projection과 versioned envelope/export/import/backup.
- 완료: 같은 entity가 여러 View에 일관되게 투영됨; 여러 날 숙박은 하나의 Entity; project timezone의 날짜 경계; 저장 roundtrip/손상/구버전/용량오류/중복 import 복구 테스트. 저장 실패 시 원본을 덮어쓰지 않는다.
- 세션 최대 2(저장 migration 포함): A selectors와 관련 테스트, B persistence와 관련 테스트. 각 경로 분리; public export는 A가 순차 통합.
- 실패 복구: 마지막 검증 snapshot을 유지, 실패 원문 보존. legacy key는 읽기만 하며 신규 namespace에만 검증 후 기록한다.

### R5 — 별도 새 앱 shell / Project / Timeline / Map

- 입력/의존: R4 PASS, 신규 Domain seed/selectors.
- 산출물(예정): platform/index.html, src/platform/**, tests/platform/**; 공존을 위한 Vite 다중 진입 설정은 단일 통합 담당이 수정.
- 완료: 프로젝트 선택·Timeline·Map이 신규 state를 사용. legacy entry 그대로 사용 가능. 일자별 marker/시간 projection, 좌표 미확정 표시, mobile/desktop 레이아웃, Pages base 경로/직접 진입 확인.
- 세션 3: A shell/project 및 공통 UI, B features/timeline/**, C features/map/**. 공통 컴포넌트 계약 선확정; shared routing/config는 A만 수정.
- 실패 복구: 새 entry를 노출하지 않고 기존 entry 유지. 새 화면 코드를 기존 UI에 강제 주입하지 않는다.

### R6 — 예약 / 비용 / Task / 대안 변경

- 입력/의존: R5 PASS.
- 산출물(예정): src/platform/features/{booking,cost,tasks,plans}/**, src/store/commands/**, tests/commands/**.
- 완료: BookingPolicy와 Booking 구분, estimate/committed/actual/refund 및 Breakdown 집계, Task 상태 유지. OptionGroup/PlanFragment 변경은 preview에서 비용·예약·Task·Timeline·Map 영향을 보여준 후 명시적 commit. 취소 시 원본 state 불변.
- 세션: 화면 독립 작업은 최대 3(booking/cost/tasks); 여러 entity를 변경하는 commands/preview는 별도 batch 최대 2(구현/독립 테스트). 같은 store 파일을 병렬 수정하지 않는다.
- 실패 복구: preview 폐기/command transaction 취소로 마지막 일관된 state 유지. UI별 복사 데이터로 임시 해결하지 않는다.

### R7 — Deterministic SIM

- 입력/의존: R6 PASS, Scenario/Constraint/Route/Option 계약.
- 산출물(예정): src/simulation/**, src/platform/features/simulation/**, tests/simulation/**.
- 완료: 명시적 입력 clock/scenario/seed가 같으면 결과 동일; pause/speed/scrub/경계/지연 시나리오 테스트. 실제 PlanVersion, Booking, TripRun을 수정하지 않는다.
- 세션 최대 2: A 순수 engine 및 UI 연결; B engine fixture/테스트. UI 시계와 시뮬레이션 계산을 분리한다.
- 실패 복구: preview session 종료, 원본 계획 유지. 실제 GPS를 simulation fact로 자동 편입하지 않는다.

### R8 — 명시적 TripRun / LIVE

- 입력/의존: R7 PASS, 검증된 PlanVersion.
- 산출물(예정): src/run/**, src/platform/features/live/**, tests/run/**.
- 완료: 사용자 실행 시작으로 TripRun 생성, 버전 고정/snapshot 정책, ItemExecution actualStart/end/status 기록. 계획 schedule 불변. GPS 권한거부/오래된 위치/네트워크 실패 처리. 단순 clock에서 실제 도착/완료를 추정 기록하지 않는다.
- 세션 최대 2: A lifecycle/GPS adapter/UI, B lifecycle 및 계획 불변성 테스트.
- 실패 복구: 마지막 durable run 유지 및 재개; 계획을 실제 시간으로 덮어쓰지 않는다. GPS 이력 수집은 별도 명시된 기능 범위로 다룬다.

### R9 — 회귀 및 가역적인 전환

- 입력/의존: R1~R8 PASS와 미해결 데이터 검토.
- 산출물(예정): tests/e2e/**, docs/release/CUTOVER_CHECKLIST.md, backup/restore 및 entry 전환 절차.
- 완료: 대표 여행 흐름, desktop/mobile, 새로고침·저장 복구, 타입/unit/E2E/build, 데이터 손실 없음. 알려진 제한과 미해결 항목 공개.
- 세션 2~3: A 통합, B E2E/회귀, C 전환/복구 문서(선택). shared 배포 설정은 A만 수정.
- 실패 복구: 기본 entry를 legacy로 되돌리고 신규 데이터/export는 유지. 기존 앱 삭제/공개 배포/사용자 데이터 대체는 이 명세만으로 자동 수행하지 않는다. **기존 앱 폐기 전에는 사용자 명시적 확인을 반드시 받는다.**

### R10 — 공유 / Fork / 권한 경계

- 입력/의존: 안정된 신규 모델과 저장 형식.
- 산출물(예정): src/sharing/**, tests/sharing/**, docs/architecture/SHARING_BOUNDARY.md.
- 완료: 공개 projection에서 confirmationCode/private payment/private notes/GPS history 기본 제외. Fork provenance/ID 재매핑/원본 버전 독립성 검증. backend/auth 실제 구축은 별도 범위.
- 세션 최대 2: A projection/Fork 계약, B privacy/참조 테스트와 문서.
- 실패 복구: export/share 차단, 비공개 원본 유지. 공개 데이터에 예약정보를 포함한 상태로 우회하지 않는다.

## 4. R3 데이터 검증 상세

**기준선 갱신 주의**: 아래 수치는 R0 감사 이후 사용자가 실제 여행 일정을 변경(2026-09-23, 9/27 히메지 센트럴파크/불꽃놀이 제거 및 오사카 시내 일정으로 대체, 9/29·9/30 예약 시간 변경, todo 정리)한 뒤 다시 센 값이다. R0 감사 시점의 46개/40·6/todo 8개는 더 이상 유효하지 않다 — migration은 반드시 현재 `src/data/trip.js`를 직접 읽어서 이 수치를 재확인하고, 만약 다시 달라져 있으면 실행 시점 값을 진실로 삼는다(이 문서 수치를 맹신하지 않는다).

- legacy 이벤트 49개 각각에 provenance를 남긴다. 새 PlanItem 수가 반드시 49개일 필요는 없으며 합침/분리/표현 변경을 설명한다.
- 6개 날짜(09-26~10-01)의 projection, 좌표 보유 occurrence 43개와 미확정 6개(seizen/bajitofu/kyorinsen/kanei/rakukanki/quattro — R0 감사 때와 동일한 6곳, 이번 데이터 변경으로 늘거나 줄지 않았다)를 추적한다. 장소 병합 후 고유 Place 수와 marker occurrence를 혼동하지 않는다.
- 모든 기존 timestamp, title/city/type/status, note/query/prep/prepMinutes/price/reservation/transport 원문을 추적 가능하게 보존한다.
- todo 7개(r1/r2/r3/r4/r5/pass/fresh) ID와 완료 상태 mapping을 검증한다. 현재 코드만으로 사용자의 실제 완료 여부는 알 수 없다. 알 수 없는 추가 key와 손상 JSON도 backup/report 대상이다. 사용자의 실제 완료 상태 저장값(localStorage 등)에 이번에 제거된 구 todo id(`taxi`, `r6`)가 남아 있다면 오류로 처리하지 말고 "더 이상 존재하지 않는 원본 항목의 이력"으로 report에 보존한다 — 조용히 버리거나 임의로 새 id에 매핑하지 않는다.
- 체크인 이벤트를 근거 없이 전체 숙박으로 만들지 않는다. 숙박 기간/다중일 표현은 근거와 decision을 남기며 날짜마다 숙박 PlanItem을 복제하지 않는다.
- 가격 범위를 확정 숫자로, 예약 권장을 confirmed Booking으로, 단순 교통 문자열을 검증된 route geometry로 바꾸지 않는다.
- 일정 없는 후보/좌표 없는 장소도 표현 가능해야 한다. unresolved를 조용히 버리지 않는다.
- 같은 입력/변환 버전에서 같은 ID/결과를 만들고 반복 import로 duplicate가 생기지 않아야 한다. 시계/GPS 상태를 ItemExecution으로 만들지 않는다.

## 5. 병렬 운영 규칙

가벼운 독립 작업 최대 4세션, 중간 2~3세션, Store/Migration/Simulation/LIVE 같은 무거운 작업 최대 2세션.
각 CURRENT_TASK에 세션 ID, subtask, 쓰기 허용/금지 파일, read 의존성, 완료 조건, validation 명령을 고정한다. 공통 파일 수정은 단일 owner 또는 dependency 완료 후 순차 통합으로 처리한다.
Qwen이 구현/테스트/검증/세션 HANDOFF를 작성하고 Codex가 작업 분해/architecture/diff review/gate를 담당한다. 실제 실행 결과는 runner log로 확인한다. 선언된 PASS만 믿지 않는다. 반복 실패는 작은 corrective task 후 Codex가 원인을 판단한다.

## 6. 이번 batch의 범위와 명령

R1만 실행한다. 새 UI, runtime store, 실제 Kansai migration은 후속 작업이다.
예정 검증 명령: npm run typecheck:domain, npm run test:domain, npm run build. 앞의 두 명령은 같은 TypeScript contract compile을 제공하며 runtime unit test가 아니다. lint는 미설정.
초기 audit source baseline 및 사용자 AGENT_WORKFLOW.md 수정은 유지한다. phase 간 진행은 완료 증거를 바탕으로 판단하며 무제한 자동 반복하지 않는다.

