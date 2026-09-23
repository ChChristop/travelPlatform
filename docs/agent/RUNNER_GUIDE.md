# Local LLM Runner Guide — 축적된 운영 지식

이 문서는 Codex(작업 세션)가 바뀌거나 토큰이 부족해 다른 에이전트로 전환되어도 동일한 실수를 반복하지 않도록, `docs/agent/local-runner.mjs` 운영 중 실제로 발생했던 문제와 그 해결책을 기록한다. **작업을 이어받는 에이전트는 이 문서를 CURRENT_TASK.md와 함께 먼저 읽는다.**

## 1. 기본 구조

- Local LLM endpoint: 실제 값은 저장소에 커밋하지 않는다 — `.env.local`(gitignored)의 `LOCAL_LLM_BASE_URL`에 두고, 형식은 `.env.example` 참고(OpenAI 호환, vLLM). 모델 ID는 매번 `/models`로 동적 조회(하드코딩 금지).
- 실행: `node docs/agent/local-runner.mjs <batch> <session> [correctionPath]`
  - 예: `node docs/agent/local-runner.mjs R3 A`, `node docs/agent/local-runner.mjs R3 A docs/agent/sessions/R3-A-correction.md`
- 배치(R1~R5)별 세션 소유권은 `OWNERSHIP` 객체에, 세션별 필수 검증은 `requiredForFinish`에 정의되어 있다. 새 배치를 시작할 때 이 두 곳과 `BATCH_EXTRA_COMMON`, `TEST_DIRS`를 함께 갱신해야 한다.
- 검증 종류(`validate(kind)`): `scope`(tsc), `runtime`(`node --experimental-strip-types --test`), `build`(vite build), `migrationRun`(R3 전용, 실제 실행), `domain`/`docs`(R1 전용).
- `docs/agent/invoke-audit.ps1`: 위와 다른, bounded action-loop이 아닌 "많이 읽고 보고서 하나 쓰기" 1-shot 패턴. `docs/agent/design-audit-runner.mjs`도 같은 패턴(설계 문서 vs 코드 대조용).

## 2. 반드시 지켜야 하는 핵심 원칙

1. **토큰/역할 분담**: 대량 읽기·비교·초안 작성(구현, 테스트 작성, 문서 대조)은 로컬 LLM에 위임한다. Codex(이 세션)의 역할은 작업 분해(CURRENT_TASK 작성), 세션 실행, **결과를 직접 검증**(선언된 PASS를 그대로 믿지 않음), 필요시 정밀한 소규모 수정을 직접 하는 것이다. 수 줄짜리 정밀한 버그(타입 오류 한 줄, CSS import 한 줄 등)는 로컬 LLM에 다시 왕복시키지 않고 Codex가 직접 고치는 편이 더 낫다 — 왕복 비용과 로컬 모델의 실수 가능성을 고려.
2. **배치 게이트**: R-phase(R1→R2→...→R10)는 절대 자동으로 다음 단계에 진입하지 않는다. 매 배치 시작 전 사용자의 명시적 승인이 필요하다.
3. **세션 종료 후 반드시 홀리스틱 재검증**: 새 세션이 "통과"를 선언해도, **이전에 완료된 모든 배치의 검증 명령을 전부 재실행**해서 회귀가 없는지 확인한다(§4의 명령 목록). 세션 자신의 검증은 자기 파일만 보기 때문에 배치 간 회귀를 못 잡는다(§3.7 참고).
4. **배치 완료 → 다음 배치 착수 전 자동 커밋** (2026-09-23 사용자 지시, 이후 배치부터 계속 적용되는 표준 절차): 한 배치가 완료되고(§3의 홀리스틱 재검증까지 통과) HANDOFF.md/WORKLOG.md/CURRENT_TASK.md 갱신이 끝나면, 다음 배치를 시작하기 전에 **그 배치의 변경사항만으로 git commit을 만든다**(로컬 커밋, `git add` 대상은 리뷰 후 결정, 커밋 메시지는 그 배치 요약). 이 로컬 커밋은 매번 사용자 승인을 다시 받지 않고 진행한다(사용자가 이미 승인한 표준 절차). **단, `git push`는 별개다 — push는 매번 사용자에게 먼저 확인받는다**(공개 저장소로 실제로 나가는 액션이므로). 즉: 배치 경계마다 로컬 커밋은 자동, 원격 push는 항상 별도 확인.

## 3. 실제로 겪은 문제와 해결책 (연대순)

### 3.1 `@ts-expect-error` 위치 오해 (R1)
로컬 모델은 "필수 프로퍼티 누락"(TS2741) 에러가 `const x: T = {` 선언 줄에 찍힌다는 걸 모르고 객체 내부 마지막 필드 줄 위에 지시어를 둬서, 원본 에러와 "Unused directive"(TS2578)가 동시에 발생하는 실수를 반복했다. Correction 프롬프트에 "누락 프로퍼티 → 선언 줄 위 / 필드 값 오류 → 그 필드 줄 위"를 명시적으로 구분해서 지시하면 해결된다.

### 3.2 "이미 검증 통과 = 수정 완료" 가짜 해결 (R2)
`local-runner.mjs`의 corrective task 실행 시 "필요 검증이 이미 green이면 재작성 생략" 프리플라이트 단축 로직이 있었는데, `scope`(컴파일)나 `runtime`(테스트 실행)이 애초에 감지 못 하는 종류의 결함(가짜 로직, `as any` 남용)에 대해 모델이 "검증 통과 중이니 이미 고쳐진 것"이라 착각하고 실제 수정 없이 handoff만 다시 쓰는 사고가 2번 발생(R2-A1의 ownership-mismatch 스텁, R2-B의 `as any`). **이 단축 로직은 완전히 제거되었다** — corrective task는 항상 "검증 통과가 수정 완료를 의미하지 않는다"는 메시지와 함께 실제 재작성을 강제한다.

### 3.3 `scope`(tsc) vs `runtime`(node 실행)의 요구사항 충돌 (R2, R3, R5에서 반복)
Node의 `--experimental-strip-types`로 런타임 테스트를 돌리려면 상대 import에 `.ts` 확장자가 필요한데, 일반 tsc는 `allowImportingTsExtensions` 없이는 확장자 붙은 import를 거부한다. 게다가 `@types/node`를 설치하지 않았기 때문에(신규 의존성 회피 방침) `console`/`node:fs`/`node:path`/`node:test`/`node:assert` 전역·모듈을 tsc가 인식 못 한다.
- **해결**: `scope` 검증에 항상 `--allowImportingTsExtensions` 플래그를 포함한다(이미 반영됨).
- **해결**: `tests/**` 아래 모든 파일과, `console`/`fs`/`path`를 직접 쓰는 Node 런타임 진입점(예: R3의 `run.ts`)은 `scope` 검증 대상에서 제외하고, 대신 실제 실행(`runtime`/`migrationRun`)으로만 검증한다. `local-runner.mjs`의 scope 파일 필터가 이 규칙을 일반화해서 처리한다.

### 3.4 사전 정의한 공유 계약이 불완전하면, 모델은 "계약대로 맞지만 결과물은 틀린" 산출물을 만든다 (R3)
R3-A용으로 Codex가 미리 써준 `types.ts`의 `MigrationResult`에 실제 seed 엔티티 배열(Workspace/Project/PlanItem/Task/Booking)이 빠져 있었다. 모델은 그 불완전한 계약을 충실히 구현해서 provenance/report만 만들고 실제 migration 데이터를 전혀 생성하지 않았다 — **계약 자체가 틀렸던 것이지 모델의 잘못이 아니었다.** 게다가 노트에는 "Booking created"라고 적어놓고 실제 Booking 객체는 안 만드는 날조성 문제도 있었다.
- **교훈**: Codex가 세션 시작 전에 미리 써주는 공유 타입 계약은 배치의 실제 산출물 요구사항(EXECUTION_SPEC의 "완료" 조건)을 빠짐없이 반영해야 한다. 세션이 끝난 뒤에는 **"계약을 지켰는지"뿐 아니라 "계약 자체가 완전했는지"도 재검토**한다.
- **교훈**: 코드가 "~했다"고 주장하는 note/log/handoff 문자열은 실제 데이터 구조(배열에 정말 그 항목이 들어있는지)와 반드시 대조해서 확인한다.

### 3.5 새 하위 폴더가 이전 배치의 넓은 tsconfig `include`에 걸려 회귀를 유발 (R3에서 발견, R4에서 사전 예방)
`tsconfig.domain.json`의 `include`가 `src/domain/**/*.ts`였는데, R3에서 `src/domain/migrations/**`를 새로 추가하자 R1의 typecheck가 갑자기 실패했다(새 코드는 `@types/node` 없이 Node API를 쓰기 때문). `exclude`를 추가하고 `tsconfig.migrations.json`을 별도로 만들어 해결.
- **교훈**: 새 배치에서 `src/domain/**`, `src/store/**` 등 **기존에 넓게 include된 경로 아래**에 새 폴더를 만들 때는, 만들기 전에 어떤 기존 tsconfig가 그 경로를 포함하는지 확인하고 처음부터 전용 tsconfig(`tsconfig.<batch-name>.json`)로 분리한다. R4는 이 교훈을 미리 적용해서 회귀 없이 지나갔다.
- **표준 명령 목록**(§4)을 배치 완료 시마다 전부 재실행하는 습관이 이 문제를 잡아낸다.

### 3.6 `local-runner.mjs`의 자동 검증 블록이 예외를 못 잡아 프로세스 전체가 죽음 (R4)
"쓰기 후 명시적 validate 액션이 없으면 자동으로 필수 kind를 검증"하는 블록이 `await validate(kind)`를 try/catch 없이 호출했다. 세션이 구현 파일만 쓰고 테스트 파일은 아직 안 쓴 시점에 자동으로 `runtime` 검증이 돌면 `validate()`가 "테스트 파일 없음" 에러를 던지고, 이게 잡히지 않아 러너 프로세스 전체가 죽었다(모델에게 실패로 보고되지 않고 그냥 크래시). **이미 수정됨** — 두 자동 검증 호출 모두 try/catch로 감싸서 실패를 `{op:'validate', kind, error}` 형태로 정상 보고하도록 고쳤다.

### 3.7 세션별 `scope`/`runtime` 통과가 배치 간 통합 버그를 못 잡음 (R2)
R2-A2가 `ValueRuleInput.moneyValues`를 필수로 선언했는데 `StateFactoryInput.moneyValues`는 optional이었다 — A2 자신의 scope 체크는 내부적으로 일관되게 처리해서 통과했지만, R2-B의 테스트가 `validateValueRules`를 직접 호출하면서 실제 타입 불일치가 드러났다(node:test는 타입을 검사하지 않으므로 런타임에서는 우연히 통과). Codex가 배치 전체에 대해 별도로 `tsc -p tsconfig.runtime.json`을 직접 돌려봐서야 발견했다.
- **교훈**: 세션별 게이트는 필요조건이지 충분조건이 아니다. 배치가 끝나면 그 배치의 **모든 세션 산출물을 합쳐서** 한 번 더 정적 검사를 돌린다.

### 3.8 공유 테스트 디렉터리 + 병렬 세션 = validate() 결과 오염 가능 (R4, R5)
`TEST_DIRS`가 배치 전체에서 하나의 디렉터리를 공유하는 경우(R2/R3/R5), `findRuntimeTestFiles()`는 그 디렉터리에 있는 **모든** `.test.ts`를 찾아서 실행한다. 두 세션이 병렬로 실행 중이면, 한 세션의 자동/수동 validate가 **다른(아직 끝나지 않은) 세션이 방금 쓴 테스트 파일까지 우연히 주워서 같이 돌릴 수 있다**(R4-C 로그에서 실제로 R4-B의 `selectByDay` 테스트가 섞여 실행됨). 이번엔 결과적으로 문제없이 넘어갔지만, 원칙적으로 한쪽의 실패가 다른 세션 탓으로 잘못 귀속될 수 있는 위험이 있다. 서로 의존관계가 없는 세션을 병렬 실행할 때는 이 점을 감안하고, validate 로그에서 "이 실패가 정말 내 세션 파일 때문인지" 확인한다.

### 3.9 Node의 `--experimental-strip-types`는 TypeScript 문법만 제거하지 JSX는 파싱하지 못한다 (R3, R5에서 반복 발견)
- R3: `src/data/trip.js`가 실제로는 안 쓰는 `import { TypeIcon } from '../components/Icons'`(JSX 파일)를 갖고 있어서, 마이그레이션 스크립트가 `trip.js`를 plain Node로 못 불러왔다. 죽은 import를 제거해서 해결(다른 파일 영향 없음, 사전에 grep으로 확인).
- R5: R5-C(Map)가 처음에 테스트 파일에서 `MapView.jsx`를 직접 import하려다 `ERR_UNKNOWN_FILE_EXTENSION`으로 실패했다. 로컬 모델은 이걸 "임포트가 안 되니 로직을 테스트 파일에 통째로 복사"하는 방식으로 우회했는데, **이건 가짜 테스트다** — 실제 컴포넌트가 나중에 바뀌어도 복사본은 그대로라 테스트가 계속 통과하는 거짓 안전감을 준다. Codex가 직접 `resolvePrimaryPlace`/`buildMarkers`를 별도 plain `.js` 파일(`mapHelpers.js`)로 추출해서 `MapView.jsx`와 테스트 파일이 **같은** 모듈을 import하도록 고쳤다.
- **표준 규칙**: `.jsx` 파일(또는 JSX 문법이 포함된 어떤 파일)은 테스트에서 절대 직접 import하지 않는다. 컴포넌트가 사용하는 순수 로직은 처음부터 별도의 `.js`/`.ts` 파일로 분리하고, 컴포넌트와 테스트 둘 다 그 분리된 모듈을 import하게 만든다. 세션에게 이 규칙을 CURRENT_TASK 단계에서 미리 명시하면 이런 우회를 예방할 수 있다.

### 3.10 통합/2차 패스를 "correction 없이 새로 실행"하면 이전 결과물을 통째로 재작성해서 회귀할 수 있다 (R5)
R5-A는 B/C 완료 후 "통합" 목적으로 correctionPath 없이 fresh 세션을 다시 돌렸다. 모델이 필요한 통합(placeholder→실제 import 교체)은 잘 했지만, **관련 없는 파일까지 처음부터 다시 생성**해서 `platform.css`의 컴포넌트 스타일(카드/nav/버튼)이 통째로 사라지고, `ProjectSummary.jsx`가 마이그레이션 내부 메모(`project.description`, "Status/visibility are structural placeholders...")를 사용자 화면에 그대로 노출하는 회귀가 생겼다. 둘 다 Codex가 시각 확인(Browser 도구) 중 발견하고 직접 고쳤다.
- **교훈**: "통합/2차 패스"처럼 이미 완성된 파일을 다시 여는 세션은, 가능하면 fresh 재실행보다 **정확히 무엇을 바꿀지 명시한 correction 파일**을 써서 범위를 좁힌다. Fresh 재실행을 쓸 수밖에 없다면, 재실행 후 diff를 검토하거나(특히 CSS/문구처럼 tsc·테스트가 검증하지 못하는 파일) 반드시 시각적으로 다시 확인한다.
- **교훈**: `tsc`/`node --test`/`vite build`는 "컴파일되는지"/"로직이 맞는지"만 확인하지, **사용자에게 실제로 무엇이 보이는지는 확인하지 못한다.** UI 배치(R5 이후)에서는 자동 검증 통과 후에도 반드시 Browser 도구로 실제 화면을 열어 확인한다.

### 3.11 외부 라이브러리는 배치마다 CSS를 다시 import해야 할 수 있다 (R5)
Leaflet은 자체 CSS(`leaflet/dist/leaflet.css`)가 없으면 지도가 빈 화면으로 렌더링된다(타일도 마커도 안 보임). 기존 앱(`src/main.jsx`)은 이미 import하고 있었지만, 완전히 격리된 새 entry(`src/platform/main.jsx`)는 그 import를 상속받지 않는다 — R5-C가 이걸 빠뜨렸다. 새 entry/모듈에서 외부 UI 라이브러리(지도, 차트 등)를 쓸 때는 그 라이브러리의 CSS를 그 entry 안에서 별도로 import해야 한다는 걸 체크리스트에 넣는다.

## 4. 배치 완료 시 반드시 재실행할 명령 (2026-09-23 기준)

```
npm run typecheck:domain                 # R1
npm run typecheck:migrations             # R3
npx tsc -p tsconfig.runtime.json         # R2 (전용 npm script 없음, 직접 -p로 실행)
npm run typecheck:selectors-persistence  # R4
node --experimental-strip-types --test tests/domain/runtime/*.test.ts tests/migrations/*.test.ts tests/selectors/*.test.ts tests/persistence/*.test.ts tests/platform/*.test.ts
npm run build                            # vite build, 기존+새 entry 모두 포함
```
새 배치를 시작하면 이 목록에 그 배치의 명령을 추가한다(예: R5는 별도 tsc 스크립트 없음 — `.jsx`라 타입 검사 대상이 아니고 `build`로만 검증됨).

## 5. 배치별 아키텍처 요약 (자세한 내용은 HANDOFF.md/WORKLOG.md 참고)

- **R1** `src/domain/**`: 순수 타입 전용(런타임 코드 없음). `tsconfig.domain.json`.
- **R2** `src/store/entities/**`, `src/domain/validation/**`: 정규화 state factory + validator. `tsconfig.runtime.json`. 런타임 테스트: `tests/domain/runtime/**`.
- **R3** `src/domain/migrations/**`: `src/data/trip.js`(읽기 전용 레거시 원본) → 실제 seed(Workspace/Project/PlanVersion/Place/PlanItem/Task/Booking) + provenance report. `tsconfig.migrations.json`. 실행: `npm run migrate:run` → `docs/migration/KANSAI_REPORT.md` 생성. 테스트: `tests/migrations/**`, fixture: `fixtures/migrations/**`.
- **R4** `src/store/selectors/**`(day/city/type projection), `src/persistence/**`(storage-adapter 주입식 저장/복원, R2 validator 재사용). `tsconfig.selectors-persistence.json`. 테스트: `tests/selectors/**`, `tests/persistence/**`.
- **R5** `src/platform/**` + `platform/index.html`: 완전히 격리된 새 Vite entry(기존 `index.html`/`src/App.jsx`는 무수정). `vite.config.js`의 `build.rollupOptions.input`으로 두 entry 등록. Project 요약 → Timeline → Map(useState 기반 화면 전환, 라우터 없음). 데이터는 `src/platform/dataSource.js`가 R3의 `migrate()`를 실제 `trip.js`에 대해 실행해서 공급. 테스트는 `tests/platform/**`(순수 로직만, 컴포넌트 렌더링 테스트 없음 — §3.9). 시각 확인은 Browser 도구로 `http://localhost:5173/platform/` 직접 열어서 수행.
