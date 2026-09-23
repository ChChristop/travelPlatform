# Handoff

## Result

PASS

## Changed

- AGENT_WORKFLOW.md (문서: Local Qwen 병렬 세션 정책, Handoff 포맷)
- IMPLEMENTATION_ROADMAP.md (2줄 추가)
- package.json (`typecheck:domain`, `test:domain` 스크립트 추가)
- src/domain/ (신규, untracked — 15개 도메인 모듈)
- tests/domain/contracts.type-test.ts (신규, untracked)
- tsconfig.domain.json (신규, untracked)
- docs/ (신규, untracked)

## Verification

- `git diff --stat`: 기존 UI/Application 코드(src/app 등) 변경 없음. 수정 파일은 문서 2건 + package.json 스크립트만.
- Domain typecheck (`npm run typecheck:domain`): 통과
- Domain type tests (`npm run test:domain`): 통과
- `npm run build`: 통과 (25 modules transformed)
- 기존 UI/Application code 불필요 변경: 없음

## Follow-up: R1-D 재테스트 (2026-09-23)

사용자가 로컬 Qwen 세션 D(contract tests)의 반복 실패 원인 조사를 요청했다. `docs/agent/sessions/R1-D.jsonl`/`R1-D-validation.json` 분석 결과, 모델이 `@ts-expect-error` 진단 anchoring을 오해하고 있었음을 확인했다: 필수 프로퍼티 누락(TS2741)은 `const x: T = {` 선언 줄에 진단이 찍히는데, 모델은 객체 내부 마지막 필드 줄 위에 지시어를 두어 원본 에러(TS2741)와 "Unused directive"(TS2578)가 동시에 발생했다. 6턴 동안 두 오답 사이를 왕복하다 세션 재시작 후에도 동일 실패 3연속으로 escalation.

`docs/agent/sessions/R1-D-correction.md`에 진단 anchoring 규칙(missing-property → 선언 줄 위 / field-value 오류 → 필드 줄 위)을 명시적으로 추가한 뒤, 검증을 위해 실패 패턴(Place/Booking/CostRecord 3곳)을 의도적으로 재현하고 `docs/agent/local-runner.mjs D`로 세션 D를 재실행했다. 이번에는 turn 0에서 한 번 재작성 후 `domain`/`build` 검증이 모두 exit 0으로 통과, 즉시 finish. Codex가 `tsc -p tsconfig.domain.json`으로 재확인 — 통과.

- Domain typecheck 재확인: 통과 (exit 0)
- `npm run build` 재확인: 통과 (25 modules transformed)
- A/B/C/D 세션 전부 `finished: true`, 각자 required validation exit 0 확인
- 기존 UI/Application code 변경 없음 (재확인)

## Follow-up: 설계 문서 대조 감사 (2026-09-23)

R2 착수 전 R1 범위 내 추가 보완으로, `travel-platform-domain-design.md`(2044줄) 전체와 `src/domain/*.ts` 14개 entity를 필드/enum 단위로 대조하는 감사를 수행했다. 토큰 절약을 위해 Claude가 직접 전체 문서를 읽는 대신, `docs/agent/design-audit-runner.mjs`(신규, invoke-audit.ps1과 동일하게 read-only/one-shot 패턴)를 작성해 로컬 Qwen이 두 자료를 직접 읽고 대조하도록 위임했다. 결과는 `docs/agent/sessions/R1-design-audit.md`.

로컬 모델 결과: 14개 entity 전부 MATCH, "결함 없음". 과거 R1-A/B/D 세션에서 모델이 근거 없는 PASS를 주장한 전례가 있어 그대로 신뢰하지 않고, Codex가 Route/Booking/Constraint/CostRecord/LodgingDetail/Scenario/TripRun·ItemExecution/PlaceReference 8곳을 설계 문서 원문과 직접 대조 — 전부 정확히 일치 확인 (enum 멤버 누락/추가 없음, required/optional 일치).

- 설계 문서 대조 감사: 결함 없음 (로컬 모델 결과 + Codex 표본 검증 8건 일치)
- 새로 추가된 파일: `docs/agent/design-audit-runner.mjs`, `docs/agent/sessions/R1-design-audit.md`
- R1 batch(실행 명세 + Domain Types + static contract tests + 설계 대조 감사)는 이것으로 완전히 마무리.

## R2 — Normalized state와 runtime 무결성 (2026-09-23, 사용자 승인 후 진행)

사용자 승인 후 착수. `docs/agent/local-runner.mjs`를 배치(batch) 개념으로 확장(`R1`/`R2`), validator 규칙을 참조/소유권(A1)과 값 유효성(A2) 두 독립 그룹으로 나눠 병렬 실행, B가 실제 runtime 테스트(Node 22의 `--experimental-strip-types --test`, 새 의존성 없이 `.ts` 테스트 직접 실행) 작성.

**세션 결과**
- A1(reference-rules.ts): 1차 시도에서 ownership-mismatch 규칙을 `projectId`가 비어있지 않은지만 확인하는 무의미한 스텁으로 구현 — 자체 주석에도 갈팡질팡한 흔적 남김. Correction으로 실제 CostRecord.projectId ↔ PlanVersion.projectId 교차 비교 구현하도록 재지시, 재실행 후 정상 반영·검증.
- A2(value-rules.ts, state.ts 등): 1차에서 정상 구현 (option/date/finite 규칙 + state factory 통합), scope 통과.
- B(runtime tests): 1차에서 branded ID 리터럴을 전부 `as any`로 캐스팅(36곳, CURRENT_TASK가 명시적으로 금지한 방식) — correction으로 R1의 관례(`as SpecificBrandedId`)를 따르도록 재지시, 재실행 후 37/37 테스트 통과 확인.

**러너 자체의 결함도 발견·수정**: A1 correction 1차 재실행 때 "필요 검증이 이미 green이면 재작성 생략" 프리플라이트 단축 로직 때문에, `scope`(tsc 컴파일)는 애초에 통과 상태였던 가짜 ownership 체크를 모델이 그대로 두고 "고쳤다"는 handoff만 다시 써서 제출함. 프리플라이트 단축 로직을 완전히 제거하고("검증 통과가 곧 수정 완료를 의미하지 않는다" 지시로 대체) 재실행해서야 실제로 고쳐짐.

**Codex 통합 검증에서만 드러난 버그**: 각 세션의 개별 `scope`/`runtime` 통과와 별개로, 배치 전체를 대상으로 `tsc -p tsconfig.runtime.json`을 직접 돌려본 결과 A2 내부에서 `ValueRuleInput.moneyValues`(필수)와 `StateFactoryInput.moneyValues`(optional)가 불일치해 실제 타입 오류가 있었음(런타임에서는 fixture가 항상 값을 채워 넣어 우연히 통과). `moneyValues?: Money[]`로 통일하고 내부 기본값(`?? []`) 처리로 수정. `tsconfig.runtime.json`의 include에서 `tests/domain/runtime/**`는 의도적으로 제외(런타임 테스트는 실행으로만 검증 — Node 내장 타입 선언에 `@types/node` 신규 의존성이 필요해지므로).

**최종 검증**
- `tsc -p tsconfig.runtime.json` (src/store/entities + src/domain/validation만): 통과 (exit 0)
- `npm run test:domain:runtime` (Node `--experimental-strip-types --test`): 37/37 통과
- `tsc -p tsconfig.domain.json` (R1 도메인 타입 회귀 확인): 통과
- `npm run build`: 통과, 기존 UI/Application code 변경 없음
- 새 npm 의존성 추가 없음

R2 batch 완료. R3(원문 보존 migration) 착수는 다시 사용자 명시적 확인 필요.

## R3 — 원문 보존 migration (2026-09-23, 사용자 승인 후 진행)

R0 감사 기준선이 이번 세션의 실제 일정 데이터 변경(9/27 히메지 제거 등)으로 낡아진 것을 재확인하고 EXECUTION_SPEC/CURRENT_TASK를 갱신한 뒤 착수. `src/data/trip.js`에 죽은 JSX import(`TypeIcon`, 실제 미사용) 하나를 제거해 마이그레이션 스크립트가 순수 Node에서 trip.js를 로드할 수 있게 했다(다른 파일에 영향 없음, 빌드 재확인).

**세션 결과**
- A(migrate.ts/run.ts): 1차 시도는 공유 계약(Codex가 작성한 `types.ts`)에 실제 엔티티 배열이 빠져 있어 — 이건 Codex 책임 — provenance/report만 만들고 실제 seed(PlanItem/Task/Booking 등)를 전혀 만들지 않았다. 게다가 "Booking created"라고 노트에 적어놓고 실제 Booking 객체는 안 만드는 날조성 문제도 있었다. `types.ts`에 `MigrationSeed`(Workspace/Project/PlanVersion/Place/PlanItem/Task/Booking)를 추가해 계약을 바로잡고 correction 지시 후 재실행 — 실제 엔티티 생성, 결정론적 ID, Booking은 실제로 생성됐을 때만 "생성됨"이라 기록하도록 수정 확인.
- B(fixtures/tests): 16개 테스트(정상 매핑/좌표 없음/다일치 숙박/확정·모호 예약/잘못된 입력/멱등성) 1차에서 전부 통과, `as any` 등 금지 패턴 없음.
- Codex 통합 검증에서 추가 발견: 새로 만든 `src/domain/migrations/**`가 R1의 `tsconfig.domain.json`(`src/domain/**` 전체 포함) 범위에 들어가 R1 회귀를 유발 — `tsconfig.domain.json`에 `exclude` 추가, migrations 전용 `tsconfig.migrations.json` 신설로 분리.

**최종 검증**
- `npm run typecheck:domain`(R1 회귀 확인): 통과
- `npm run typecheck:migrations`: 통과
- `npm run test:domain:runtime`(R2, 37개) + `npm run test:migrations`(R3, 16개): 전부 통과
- `npm run migrate:run`: 실제 `src/data/trip.js`(49 events/7 todos) 기준 마이그레이션 실행 성공, `docs/migration/KANSAI_REPORT.md` 생성 확인
- `npm run build`: 통과, 기존 UI/Application code 변경 없음(레이아웃 관련 별도 작업 제외)
- 새 npm 의존성 추가 없음

R3 batch 완료. R4(Selector/저장) 착수는 다시 사용자 명시적 확인 필요.

## R4 — Selector와 안전한 저장 (2026-09-23, 사용자 승인 후 진행)

R3와 달리 A(selectors)/B(persistence)는 서로 독립적이라 처음부터 병렬 실행. 두 세션 모두 첫 실행에서 러너 자체의 결함(자동 검증 블록이 `validate()`의 예외를 못 잡고 프로세스 전체가 죽는 버그 — 테스트 파일을 아직 안 쓴 시점에 자동으로 `runtime` 검증이 돌면서 발생)으로 실패 — Codex가 `local-runner.mjs`를 수정(try/catch 추가)한 뒤 재실행해서 정상 완료.

**세션 결과**
- A(selectors): `selectByDay`(다일치 숙박이 시작~종료일 모든 day 버킷에 동일 참조로 등장, 미확정 스케줄은 `unscheduled` 버킷, 타임존 기준 날짜 경계), `selectByCity`(Place.region.city 역참조, 도시 미상은 `unknown`), `selectByType`. 17/17 테스트 통과, mutate 없음/정렬/버킷 처리 전부 스펙대로 구현 확인(코드 직접 검토).
- B(persistence): `saveState`/`loadState`/`exportState`/`importState`, storage는 인터페이스로 주입. Roundtrip, 손상 데이터/버전 불일치 시 원문 보존, 저장 실패 시 원본 불변, **R2의 `validateReferenceRules`/`validateValueRules`를 실제로 재사용하는 semantic validation**(코드 직접 확인, 날조 아님), 반복 import 안전성까지 9/9 테스트 통과.
- `as any` 등 금지 패턴 없음(둘 다 확인).

**최종 검증**: R1(`typecheck:domain`)/R2(tsconfig.runtime)/R3(`typecheck:migrations`) 회귀 없음 확인 후, R4용 `tsconfig.selectors-persistence.json` 신설(R3에서 겪은 "새 폴더가 기존 tsconfig include 범위에 걸리는 회귀" 재발 방지 차 처음부터 전용 tsconfig로 분리). R1~R4 통합 런타임 테스트 79개(37+16+17+9) 전부 통과, `npm run build` 통과, 새 의존성 없음, 기존 앱 코드/localStorage 미접근.

R4 batch 완료. R5(새 앱 shell) 착수는 다시 사용자 명시적 확인 필요.

## R5 — 별도 새 앱 shell / Project / Timeline / Map (2026-09-23, 사용자 승인 후 진행)

처음으로 실제 React 화면(`src/platform/**`, 완전히 새로운 Vite entry `platform/index.html`)을 만든 배치. 기존 entry(`index.html`/`src/App.jsx`/`src/components/**`/`src/data/trip.js`/`src/styles.css`)는 무수정 확인. `vite.config.js`에 `build.rollupOptions.input`으로 두 entry(기존+`platform/`) 등록.

**세션 결과**: A(shell/dataSource, R3 `migrate()`를 실제 trip.js에 실행해 EntityState 공급)→B(Timeline, R4 `selectByDay` 사용)‖C(Map, Leaflet 마커+선택 동기화+좌표미확정 안내) 병렬→A 2차(통합). B/C 1차 실행이 러너 자체 크래시 버그(자동 검증 블록의 미처리 예외)로 실패해 러너 수정 후 재실행.

**Codex가 Browser 도구로 시각 확인하며 직접 발견·수정한 문제** (자동 검증으로는 못 잡음):
- R5-C의 테스트가 `.jsx`를 직접 import할 수 없다는 이유로 로직을 테스트 파일에 통째로 복사해 넣은 가짜 테스트였음 — `mapHelpers.js`로 실제 로직을 분리해 컴포넌트와 테스트가 같은 모듈을 쓰도록 수정.
- R5-A의 2차(통합) 실행이 correction 없이 fresh로 다시 돌면서 `platform.css`의 카드/nav/버튼 스타일을 통째로 날리고, 마이그레이션 내부 메모(`project.description`)를 사용자 화면에 그대로 노출하는 회귀 발생 — 둘 다 직접 수정.
- Leaflet CSS(`leaflet/dist/leaflet.css`)를 새 entry에서 import하지 않아 지도가 빈 화면으로 렌더링 — import 추가로 해결.

**최종 시각 확인**(Browser 도구, `http://localhost:5173/platform/`): 프로젝트 요약 카드 정상 표시, 일정 화면이 실제 마이그레이션 데이터(49개 이벤트) 표시, 지도 화면이 실제 좌표에 마커 표시 + 좌표 미확정 6곳 안내 목록 정확히 일치, 일정↔지도 선택 동기화(빨간 강조+자동 확대) 확인, 기존 앱(`/`) 회귀 없음 확인.

**최종 검증**: R1~R4 전체 typecheck 재확인, 통합 런타임 테스트 99개(37+16+17+9+ tests/platform 20) 전부 통과, `npm run build` 통과(기존+새 entry 모두), 새 npm 의존성 없음.

이번 배치에서 얻은 운영 지식(로컬 모델의 가짜 테스트 패턴, fresh 재실행의 회귀 위험, JSX/CSS 관련 함정)은 [docs/agent/RUNNER_GUIDE.md](docs/agent/RUNNER_GUIDE.md)에 정리했다 — 세션이 바뀌어도 여기서 이어서 확인 가능.

R5 batch 완료. R6(예약/비용/Task/대안 변경) 착수는 다시 사용자 명시적 확인 필요.

## 별도: UI 반응형 레이아웃 수정 (2026-09-23)

세로로 긴/좁은 화면에서 타이틀·일정·상세 바 레이아웃이 깨지는 문제를 별도 에이전트가 시각적으로 재현·수정(`src/styles.css`의 grid 행 비율/최소 높이 문제). 이후 사용자 요청에 따라 추가 조정 다수 반영: clockPanel이 좁을 때 줄바꿈되도록 수정(LIVE/SIM 토글에 날짜가 가려지던 문제), 일정/상세를 세로 스택 대신 가로 배치로 변경(각각 전체 높이 확보), 그만큼 지도 높이 비중 확대, 일정/상세 너비 비율 조정(53:47), 상세 패널의 배지+제목 한 줄 배치, 이벤트 행 패딩/간격 축소, footer 한 줄 고정(clamp 기반 반응형 폰트 크기). 모두 여러 뷰포트 폭에서 스크린샷/DOM 측정으로 시각 검증하고 데스크톱 레이아웃 회귀 없음 확인, 빌드 통과.

## 별도: 실제 여행 일정 데이터 수정 (2026-09-23)

사용자가 제공한 확정 변경사항을 `src/data/trip.js`에 직접 반영 (R1/R2 도메인 재구축 파이프라인과 무관한 기존 앱의 실 데이터 수정 — legacy migration이 아니라 사용자의 실제 여행 일정 갱신). 9/27 히메지 불꽃놀이 일정 제거 및 오사카 시내 대체 일정, 9/29 京林泉 11:30로 시간 변경, 9/30 楽関記 17:30 예약 확정 및 고베 동선 재배치, 馬耳東風·手打ち蕎麦 かね井 미예약 상태·전화번호 반영, 관련 todo 정리. `npm run build` 통과 확인.
