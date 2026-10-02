# R6-C 로컬 코딩 세션: Platform 모듈 수정 작업

## 1. 개요
현재 `src/platform` 모듈은 빌드 및 기존 테스트는 통과했으나, React 훅 규칙 위반, 트랜잭션 무결성 결함, 상태 투영 불완전성, 그리고 데이터 소스 오류 처리 누락이라는 치명적인 런타임 및 로직 오류가 존재합니다. 본 작업은 **소유 파일(Owned Files)** 내에서만 이러한 문제를 수정하고, 의미 있는 테스트를 재작성하는 것을 목표로 합니다.

**소유 파일 (Owned Files):**
- `src/platform/PlatformApp.jsx`
- `src/platform/dataSource.js`
- `src/platform/types.js`
- `tests/platform/r6-dataSource.test.ts`

---

## 2. 상세 수정 요구사항

### 2.1. `src/platform/PlatformApp.jsx`: React 훅 순서 및 상태 초기화 수정
**문제:**
- `useMemo` 렌더링 단계에서 `setState`/`setError`를 호출하여 사이드 이펙트를 유발함.
- 조기 반환(Early Return) 이후에 `useMemo`를 호출하여 React 훅 순서(Hook Order)를 위반함.

**수정 지시:**
1. **상태 초기화:** `useState`의 지연 초기화(Lazy Initialization) 또는 `getPlatformState`를 사용하여 초기 상태를 설정하라.
2. **훅 순서 보장:** 모든 `useMemo`, `useEffect`, `useState` 호출은 **조기 반환(early return) 이전**에 무조건적으로 실행되도록 배치하라.
3. **안전한 투영:** `activeState`는 조건부 로직이 아닌, 훅 순서가 보장된 위치에서 안전하게 파생(Derive)되어야 한다.

### 2.2. `src/platform/PlatformApp.jsx`: 트랜잭션 무결성 (Save-First Strategy)
**문제:**
- `updateState`가 `savePlatformState` 실행 **전**에 `setState`를 호출하여, 저장 실패 시 UI와 저장소 상태가 불일치하는 문제를 발생시킴.

**수정 지시:**
1. **저장 우선:** `savePlatformState`를 먼저 실행하라.
2. **성공 시에만 상태 갱신:** 저장 성공 시에만 `setState`를 호출하고 `success`를 반환하라.
3. **실패 처리:** 저장 실패 시:
   - 원본 상태(Raw State)와 미리보기(Preview)를 유지하라.
   - 에러를 UI에 노출하라.
   - `commands` 및 `createGroup` 함수에서도 저장 실패를 UI로 전파해야 한다.
   - **미리보기(Preview)는 커밋(Commit) 성공 시에만 클리어**하라.

### 2.3. `src/platform/PlatformApp.jsx`: `deriveActiveState` 완전한 상태 투영
**문제:**
- `deriveActiveState`가 부분적인 배열만 반환하여, 이를 `state`로 직접 전달할 경우 `CostView`에서 `state.projects[0]` 접근 시 크래시가 발생함.

**수정 지시:**
1. **완전한 EntityState 생성:** 원본 상태(Raw State)를 스프레드(Spread)하고, 활성(active)인 `planItems`, `bookings`, `tasks`, `costRecords`, `routes`, `places`만 교체하여 **완전한** `EntityState` 객체를 생성하라.
2. **뷰 적용:**
   - `timeline`, `map`, `booking`, `cost`, `tasks` 뷰는 이 **완전한 투영 상태**를 사용해야 한다.
   - `plans` 뷰는 **원본 상태(Raw State)**를 사용해야 한다.

### 2.4. `src/platform/dataSource.js`: 시드 데이터 및 오류 처리 강화
**문제:**
- 시드 데이터 저장 실패 시 에러가 표면화되지 않음.
- 키 누락과 손상된 데이터(Corrupt Data)를 구별하지 못함.

**수정 지시:**
1. **에러 표면화:** 시드 데이터 저장 실패 시 에러를 명확히 노출하라.
2. **키 누락 처리:** `getItem`이 `null`을 반환하는 경우를 직접 확인하여 키 누락으로 처리하라.
3. **손상 데이터 보존:** 데이터가 손상된 경우(Corrupt Raw)를 덮어쓰지 않고 보존하며, 에러를 반환하라.

### 2.5. `tests/platform/r6-dataSource.test.ts`: 테스트 재작성
**문제:**
- 기존 테스트는 가치가 낮으며, `any` 캐스트를 사용하고 있음.

**수정 지시:**
1. **기존 테스트 삭제:** 기존 `r6-dataSource.test.ts` 내용을 모두 삭제하라.
2. **의미 있는 테스트 작성:**
   - **Missing Key:** 키가 없을 때의 동작 검증.
   - **Corrupt Data:** 손상된 데이터를 읽을 때의 동작 검증 (덮어쓰기 금지 확인).
   - **Persist Failure:** 저장 실패 시 에러 전파 검증.
3. **타입 안전성:** `any` 타입 캐스트를 사용하지 않도록 하라.
4. **테스트 가능성 유지:** 테스트가 실제 로직을 검증할 수 있도록 구조를 유지하라.

---

## 3. 검증 및 빌드

1. **빌드 확인:** `npm run build` 또는 해당 프로젝트의 빌드 명령어를 실행하여 컴파일 오류가 없는지 확인하라.
2. **테스트 실행:** `npm test` 또는 `npx jest tests/platform/r6-dataSource.test.ts`를 실행하여 새로운 테스트가 모두 통과하는지 확인하라.
3. **런타임 검증:**
   - `PlatformApp` 렌더링 시 훅 순서 오류가 없는지 확인.
   - `updateState` 실패 시 UI가 원본 상태를 유지하고 에러가 표시되는지 확인.
   - `CostView`에서 `state.projects[0]` 접근 시 크래시가 없는지 확인.

> **참고:** 이전 빌드/테스트가 통과했더라도, 위 로직 오류는 런타임에서 치명적인 문제를 일으킬 수 있으므로 반드시 수정하라.
