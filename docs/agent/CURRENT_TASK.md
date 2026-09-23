# Task R5 — 별도 새 앱 shell / Project / Timeline / Map

**상태: 완료 (2026-09-23).** A(1차+통합 2차)/B/C 세션 완료, Codex가 Browser 도구로 시각 확인 후 발견한 두 회귀(platform.css 스타일 소실, project.description 노출, Leaflet CSS 누락, 가짜 테스트)를 직접 수정. 기록: 루트 HANDOFF.md의 "R5" 절, docs/agent/WORKLOG.md의 "Phase 5 (R5)" 절, docs/agent/sessions/R5-*.md.

**반드시 먼저 읽을 것: [docs/agent/RUNNER_GUIDE.md](RUNNER_GUIDE.md)** — local-runner.mjs 운영 중 실제로 겪은 문제와 해결책, 배치 완료 시 재실행해야 하는 검증 명령 전체 목록, 배치별 아키텍처 요약이 정리되어 있다. 세션/토큰이 바뀌어도 이 문서만 읽으면 동일한 실수를 반복하지 않고 이어서 작업할 수 있다.

R6(예약/비용/Task/대안 변경) 착수는 batch별 Codex gate 원칙에 따라 사용자 명시적 확인 필요.

## 이전 배치
R1~R4는 완료 및 검증됨. 기록: 루트 HANDOFF.md의 R1~R4 절, docs/agent/WORKLOG.md의 Phase 1~4 절. R5는 이 위에 **처음으로 실제 화면(React 컴포넌트)** 을 만든다.

## Goal / 승인 범위
`platform/index.html`이라는 **완전히 별도의 새 Vite entry**를 만들어 R1~R4에서 만든 domain/selectors/persistence 위에 최소 기능 새 앱(Project 요약 → Timeline → Map)을 띄운다. 기존 entry(`index.html`→`src/main.jsx`→`src/App.jsx`)와 기존 `src/components/**`, `src/data/trip.js`, `src/styles.css`는 **절대 수정하지 않는다** — 새 코드는 `src/platform/**`에 완전히 격리한다. 기존 앱과 새 앱은 서로 다른 URL(`/`와 `/platform/`)로 공존하며, 이번 batch가 끝나도 여전히 기존 앱이 기본이다.

라우팅은 만들지 않는다(react-router 등 새 의존성 추가 금지) — `platform` 엔트리 안에서 간단한 `useState` 기반 화면 전환(프로젝트 요약 / 일정 / 지도)이면 충분하다. 이번 마이그레이션 산출물(R3)은 프로젝트가 1개뿐이므로 "프로젝트 선택"은 그 1개 프로젝트를 보여주고 들어가는 요약 화면으로 충분하다 — 존재하지 않는 여러 프로젝트를 지어내지 않는다.

## 기준
docs/EXECUTION_SPEC.md의 "R5 — 별도 새 앱 shell / Project / Timeline / Map" 절, 이 문서의 세부 규칙.

## 검증 방식 (이번 배치부터 다름)
UI 코드(.jsx)는 TypeScript가 아니며(기존 앱과 동일하게 plain JSX), React 컴포넌트 렌더링을 테스트하는 라이브러리(@testing-library/react 등)는 새 의존성이라 추가하지 않는다. 따라서:
- `tests/platform/**`는 **순수 로직**만 테스트한다 (예: 마이그레이션 seed를 화면이 쓰는 형태로 변환하는 함수, 날짜/도시 그룹 결과를 마커 목록으로 바꾸는 함수 등) — 실제 컴포넌트 렌더링 테스트는 범위 밖이다.
- 실제 화면이 보이는지, 상호작용이 되는지는 각 세션이 끝난 뒤 **Codex가 Browser 도구로 직접 띄워서 시각 확인**한다 (R1~R4의 tsc/node:test 같은 자동 검증이 UI 비주얼 정합성까지 보장하지 않기 때문). 세션 자체의 필수 검증은 `build`(vite build 성공)와 있는 경우 `runtime`(로직 테스트)이다.

## 공유 계약 (Session A가 만들고, B/C는 import만 한다)
`src/platform/types.js`(또는 `.ts`, A 재량)에 최소 계약을 정의한다:
- `PlatformViewProps`: `{ state, timezone, selectedItemId, onSelectItem }` — `state`는 R4 selector에 넣을 `EntityState`, `selectedItemId`는 현재 선택된 PlanItem id(string|null), `onSelectItem`은 선택 변경 콜백. Timeline/Map 화면 모두 이 하나의 계약으로 상태를 공유해서, 한쪽에서 항목을 고르면 다른 쪽도 갱신된다(기존 앱의 Timeline↔Map↔EventDetail 선택 동기화와 동일한 패턴).
- 데이터 브리지: `src/platform/dataSource.js` — R3의 `migrate()`를 실제 `src/data/trip.js`(`events`,`todos`)에 대해 실행해 `EntityState` 형태로 변환해 반환하는 함수(순수 함수, 렌더링 시점에 1회 호출). 이 함수의 반환값이 R4 selector들의 입력이 된다.

## Session A — Shell / Project / 공용 (src/platform/**, vite.config.js, platform/index.html)
쓰기 허용: `vite.config.js`(공유 빌드 설정 — 이번 batch에서 유일하게 A만 수정), `platform/index.html`, `src/platform/main.jsx`, `src/platform/PlatformApp.jsx`, `src/platform/Shell.jsx`, `src/platform/ProjectSummary.jsx`, `src/platform/dataSource.js`, `src/platform/types.js`, `tests/platform/dataSource.test.ts`.

1. `vite.config.js`에 `build.rollupOptions.input`으로 기존 `index.html`과 새 `platform/index.html` 두 entry를 등록한다(dev 서버 동작은 별도 config 없이도 Vite가 디렉터리 기준으로 서빙하지만, production build에는 명시가 필요하다). 기존 `plugins`/`base` 설정은 보존한다.
2. `platform/index.html`: 기존 `index.html`과 유사한 최소 셸, `<script type="module" src="/src/platform/main.jsx">`.
3. `src/platform/main.jsx`: `ReactDOM.createRoot` + `<PlatformApp />`. 기존 `src/main.jsx`는 건드리지 않는다.
4. `src/platform/dataSource.js`: 위 계약대로 `migrate()`를 호출해 `EntityState`를 만든다. 실패 시(예외) 화면 전체가 하얗게 죽지 않도록 에러 상태를 함께 반환하거나 예외를 잡아 화면에 보여준다.
5. `src/platform/PlatformApp.jsx`: `dataSource`로 state를 얻고, `useState`로 현재 화면('summary'|'timeline'|'map')과 `selectedItemId`를 관리. `Shell`이 nav를 그리고 현재 화면에 맞는 하위 컴포넌트(B/C가 만들 것)를 렌더링한다. B/C의 컴포넌트가 아직 없을 때를 대비해 placeholder를 두되, 완료 시점엔 실제 import로 교체한다(A가 마지막에 통합).
6. `ProjectSummary.jsx`: `state.project`(단일 TravelProject) 요약 카드 + "일정 보기"/"지도 보기" 버튼.
7. 기존 `src/styles.css`는 import하지 않는다(수정 금지 대상이므로 새 최소 스타일은 `src/platform/platform.css` 등 새 파일에 작성하고 `main.jsx`에서 import). 기존 디자인 토큰(색상 변수 등)을 참고해 베껴 써도 되지만 기존 파일을 import/수정하지 않는다.

완료 조건: `vite build` 성공(`build`), A 소유 파일들이 문법 오류 없이 로드됨. B/C 완료 후 A가 다시 호출되어(2차 세션) 최종 통합 import로 교체하고 `build` 재확인한다.

## Session B — Timeline (src/platform/features/timeline/**), A 완료 후 시작
쓰기 허용: `src/platform/features/timeline/TimelineView.jsx`, `src/platform/features/timeline/TimelineView.css`(선택), `tests/platform/timeline-helpers.test.ts`.

`PlatformViewProps`를 받아 R4의 `selectByDay(state, timezone)`로 날짜별 그룹을 만들어 렌더링한다. 각 PlanItem 행 클릭 시 `onSelectItem(item.id)` 호출. `places`가 비어있는(좌표 미확정) 항목은 목록에서 "위치 미확정" 같은 표시를 한다(숨기지 않는다). `selectedItemId`와 일치하는 행은 강조 표시.

## Session C — Map (src/platform/features/map/**), A 완료 후 시작
쓰기 허용: `src/platform/features/map/MapView.jsx`, `src/platform/features/map/MapView.css`(선택), `tests/platform/map-helpers.test.ts`.

`PlatformViewProps`를 받아 Leaflet(이미 의존성에 있음, `import L from 'leaflet'`)으로 지도를 그린다. `state.places`와 `state.planItems`를 이용해, 좌표가 있는 PlanItem만 마커로 표시(좌표 없는 것은 지도에 그리지 않되 목록으로 별도 안내). 마커 클릭 시 `onSelectItem(item.id)` 호출, `selectedItemId`와 일치하면 마커를 강조/포커스. `tests/platform/map-helpers.test.ts`는 "PlanItem+Place 배열 → 마커 좌표 배열" 같은 순수 변환 함수만 테스트한다(Leaflet 자체 렌더링은 테스트 범위 밖).

## 공통 금지 사항
`src/App.jsx`, `src/components/**`, `src/data/trip.js`, `src/styles.css`, `src/main.jsx`, `index.html` 수정 금지. `src/domain/**`, `src/store/**`, `src/persistence/**` 수정 금지(읽기만). `any` 없음(JS라 타입 자체가 없지만 JSDoc/구조는 명확하게). 새 npm 의존성 추가 금지(react-router, testing-library 등 포함).

## Validation / 금지
로컬 러너가 `build`(vite build)와, 파일이 있으면 `runtime`(해당 세션의 `tests/platform/*.test.ts`)을 검증한다. Codex는 매 세션 종료 후 R1~R4 typecheck/test를 재실행해 회귀가 없는지 확인하고, **반드시 Browser 도구로 `/platform/`을 직접 열어 시각 확인**한다(자동 검증이 커버하지 못하는 부분). git reset --hard 등 파괴적 명령 금지, commit/push/deploy 금지.
