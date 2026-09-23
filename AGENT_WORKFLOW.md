# Agent Workflow — Local Qwen Implementation + Codex Supervision

> 목표: Local Qwen3.8-27B를 실제 구현 작업에 최대한 활용하고, Codex는 작업 분해·지시·Diff 검증·테스트 검증에 집중하여 Codex 토큰 사용량을 줄인다.

> **세션/에이전트가 바뀌어도 반드시 먼저 읽을 문서**: [docs/agent/RUNNER_GUIDE.md](docs/agent/RUNNER_GUIDE.md) — local-runner.mjs 사용법, 실제로 겪은 문제와 해결책, 배치 완료마다 재실행해야 하는 검증 명령 전체 목록. 여기(AGENT_WORKFLOW.md)에 없는 운영 디테일은 그 문서에 있다.

---

# 1. 역할 분담

## Local Qwen3.8-27B

기본 역할:

```text
Primary Implementer
```

담당:

- Repository 탐색
- 코드 작성
- 반복적인 Refactor
- Type 정의
- Selector 작성
- Test 작성
- 기존 코드에 Adapter 추가
- build/lint/test 실행
- 간단한 오류 수정
- 작업 로그 작성
- Git diff 정리

가능하면 대부분의 파일 수정은 Local Agent가 수행한다.

---

## Codex

기본 역할:

```text
Planner
Reviewer
Verifier
Escalation Agent
```

담당:

- Phase 단위 작업 지시
- 어려운 설계 판단
- Domain invariant 검증
- Local Agent 결과 검토
- Git diff 검토
- 테스트 결과 검토
- 위험한 변경 탐지
- 오류 원인 판단
- 다음 작업 지시 생성

기본적으로 Codex가 직접 대량 구현하지 않는다.

다음 경우에만 직접 수정 고려:

- Local Agent가 같은 오류를 반복
- 구조적 버그
- 복잡한 migration
- concurrency/state bug
- difficult TypeScript inference
- 배포를 막는 blocking issue

---

# 1.1 Local Qwen 병렬 세션 정책

Local Qwen3.8-27B는 동시에 3~4명까지 사용할 수 있다.

작업 성격에 따라 병렬 세션 수를 조절한다.

- 가벼운 작업: 최대 4개 세션
- 중간 작업: 2~3개 세션
- 무거운 작업: 최대 2개 세션

가벼운 작업 예:

- 타입 정의
- 테스트 작성
- 문서화
- 단순 Selector
- 반복적인 CRUD
- 서로 독립적인 Component wiring

무거운 작업 예:

- 대규모 Migration
- Store 구조 변경
- 복잡한 State 전환
- Simulation
- LIVE 상태 처리
- 광범위한 Refactor

병렬 작업 시 동일 파일을 여러 세션이 동시에 수정하지 않도록 작업 범위를 분리한다.

가능하면 다음처럼 역할을 분할한다.

Session A → 구현
Session B → 테스트
Session C → 별도 독립 모듈 구현
Session D → 문서/검증

무거운 작업에서는:

Session A → 주 구현
Session B → 테스트 / 검증

형태를 우선한다.

# 2. Local Model Endpoint

Local LLM endpoint는 저장소에 커밋하지 않는다. 실제 값은 `.env.local`(gitignored)의 `LOCAL_LLM_BASE_URL`에 두고, 형식은 `.env.example`을 참고한다.

vLLM/OpenAI-compatible endpoint인 경우 권장 Base URL 형식:

```text
http://<internal-local-llm-host>:<port>/v1
```

단, 실제 API 형식과 Model ID는 **첫 실행 시 확인**한다.

예:

```bash
curl "$LOCAL_LLM_BASE_URL/models"
```

응답에서 실제 model id를 사용한다.

Model 이름을 문서에 하드코딩하지 않는다.

---

# 3. OpenCode 사용 권장

OpenCode가 이미 설치되어 있으므로 Local Qwen 작업 runner로 사용하는 것을 권장한다.

이유:

- Repository 단위 코드 탐색
- 파일 편집
- 반복 작업
- Git diff 기반 작업
- Local/OpenAI-compatible endpoint 연결
- Codex와 역할 분리가 쉬움

단, 특정 OpenCode 버전의 config schema는 설치 버전에 따라 달라질 수 있으므로 임의의 설정 문법을 하드코딩하지 않는다.

먼저 현재 설치 버전과 provider 설정 방식을 확인한다.

```bash
opencode --version
opencode --help
```

필요하면 해당 버전의 config/provider 문서를 기준으로 Local endpoint를 연결한다.

---

# 4. 환경 변수 권장

Repository에 실제 endpoint를 코드로 박지 않는다.

예:

```bash
LOCAL_LLM_BASE_URL=http://<internal-local-llm-host>:<port>/v1
LOCAL_LLM_MODEL=<resolved-model-id>
```

(실제 값은 `.env.local`에만 둔다. `.env.example` 참고.)

API key를 요구하지 않는 Local vLLM이면 dummy key가 필요한 client도 있을 수 있다.

그 경우:

```bash
LOCAL_LLM_API_KEY=local
```

처럼 환경 변수로만 관리한다.

`.env.local`은 Git에 commit하지 않는다.

---

# 5. 작업 문서 구조

Repository에 다음 디렉터리를 둔다.

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
└─ decisions/
   └─ ADR-xxxx.md
```

---

# 6. CURRENT_TASK.md

Codex가 각 작업 전에 Local Agent에게 줄 지시를 작성한다.

권장 형식:

```md
# Task

## Goal

이번 단계의 최종 목표.

## Allowed Scope

수정 가능한 파일/폴더.

## Do Not Touch

변경 금지 영역.

## Required Changes

구체적 구현 항목.

## Invariants

반드시 지켜야 하는 Domain 규칙.

## Validation

실행할 command.

## Completion Output

작업 후 HANDOFF.md에 작성할 내용.
```

Local Agent는 **CURRENT_TASK.md 범위 밖 변경을 최소화**한다.

---

# 7. HANDOFF.md

Local Agent가 작업 완료 후 Codex에게 전달하는 짧은 보고서.

Codex 토큰 절약을 위해 반드시 간결하게 유지한다.

예:

```md
# Handoff

## Result

PASS / PARTIAL / FAIL

## Changed

- src/domain/plan.ts
- src/store/domainStore.ts
- ...

## Summary

- Added PlanItem discriminated union.
- Added normalized entity store.
- No UI changes.

## Validation

- npm run build: PASS
- npm run lint: PASS
- npm test -- domain: PASS

## Risks

- Legacy trip migration not implemented yet.

## Diff

12 files changed, +420/-35

## Next

Phase 3 legacy migration adapter.
```

Codex는 우선 이 문서만 읽는다.

---

# 8. WORKLOG.md

Local Agent의 장황한 작업 과정은 Codex에게 매번 전달하지 않는다.

필요한 경우에만 `WORKLOG.md`에 기록한다.

예:

```text
시도한 접근
실패한 command
발견한 legacy quirk
추후 cleanup
```

Codex는 문제가 있을 때만 읽는다.

---

# Parallel Task Coordination

병렬 세션을 사용할 경우 Codex는 CURRENT_TASK.md에 다음을 명시한다.

- Session ID
- 담당 Subtask
- 수정 가능 파일
- 수정 금지 파일
- 의존 관계
- 완료 조건

예:

Session A

- Domain types
- src/domain/\*\*

Session B

- Domain unit tests
- src/domain/\*_/_.test.\*

Session C

- Documentation
- docs/\*\*

서로 같은 파일을 수정하지 않는다.

병렬 작업 완료 후 Codex가 HANDOFF와 diff를 통합 검토한다.

# 9. Token-Minimized Codex Review Flow

기본 Loop:

```text
Codex
  ↓
CURRENT_TASK.md 작성

Local Qwen
  ↓
구현
  ↓
build/lint/test
  ↓
HANDOFF.md

Codex
  ↓
HANDOFF 확인
  ↓
git diff --stat
  ↓
핵심 diff만 검토
  ↓
필요 시 test 재실행

PASS
  ↓
다음 CURRENT_TASK
```

Codex가 매 Phase마다 Repository 전체를 재분석하지 않는다.

---

# 10. Codex가 먼저 볼 정보 순서

Token 절약을 위해 아래 순서를 따른다.

### Level 1

```text
HANDOFF.md
git status --short
git diff --stat
```

문제가 없으면 여기서 다음 단계로 갈 수도 있다.

### Level 2

변경된 핵심 파일만:

```text
git diff -- src/domain/...
git diff -- src/store/...
```

### Level 3

의심되는 테스트/오류가 있을 때만 관련 Component/기존 코드 확인.

### Level 4

구조적 문제가 있을 때만 Repository 전체 탐색.

---

# 11. Local Agent Prompt Template

Codex가 Local Agent에게 전달할 기본 Prompt:

```text
Read these files first:

1. docs/architecture/travel-platform-domain-design.md
2. docs/agent/CURRENT_TASK.md
3. docs/agent/CURRENT_ARCHITECTURE.md

Implement only the scope described in CURRENT_TASK.md.

Important:
- Preserve the current UI/design unless explicitly requested.
- Do not perform unrelated cleanup.
- Do not replace existing components merely to simplify implementation.
- Follow the domain invariants.
- Prefer adapters/selectors over UI rewrites.
- Run all validation commands specified in CURRENT_TASK.md.
- Update docs/agent/HANDOFF.md after completion.
- Do not begin the next phase.
```

---

# 12. Codex Review Prompt Template

Codex 검증용:

```text
Review the implementation for the current phase.

Read in this order:
1. docs/agent/HANDOFF.md
2. docs/agent/CURRENT_TASK.md
3. git diff --stat
4. only the diffs relevant to the task

Check:
- Did the implementation meet the task?
- Were any domain invariants violated?
- Was current UI/design changed unnecessarily?
- Is data duplicated between views?
- Are legacy data migrations safe?
- Are tests sufficient for the changed domain logic?
- Is there any high-risk state or persistence bug?

If acceptable:
- mark PASS
- write the next CURRENT_TASK.md

If not:
- produce a minimal corrective task for Local Qwen
- do not rewrite the whole implementation unless necessary
```

---

# 13. Failure Escalation Policy

Local Qwen은 한 문제를 무제한 반복하지 않는다.

권장:

```text
Attempt 1
→ Local Qwen fix

Attempt 2
→ Local Qwen fix with Codex hint

Attempt 3
→ Codex analyzes root cause
```

3회 이상 동일 실패가 발생하면 Codex가 직접 구조를 판단한다.

---

# 14. Git 규칙

Local Agent는 작업 전:

```bash
git status
```

확인.

사용자 수정사항을 절대로 reset하지 않는다.

금지:

```bash
git reset --hard
git checkout .
git clean -fd
```

명시적 승인 없이 실행하지 않는다.

---

## Commit

Phase 검증 PASS 이후만 commit.

예:

```bash
git add <scoped files>
git commit -m "refactor: add normalized travel domain store"
```

사용자 디자인 수정사항과 Domain refactor를 한 Commit에 섞지 않는다.

---

# 15. Design Preservation Rule

현재 사용자가 수정한 UI가 기준이다.

Local Agent가 다음 이유로 UI를 재작성하는 것을 금지한다.

```text
"새 구조에 맞추기 쉬워서"
"코드를 간단하게 만들기 위해"
"기존 Component가 복잡해서"
```

대신:

```text
Selector
Adapter
ViewModel
Facade
```

를 사용한다.

---

# 16. Domain Invariant Review Checklist

Codex는 Phase review 시 다음을 확인한다.

- PlanItem이 의미 단위로 유지되는가?
- 날짜별 View 때문에 Entity를 복제하지 않았는가?
- Place와 PlanItem을 분리했는가?
- BookingPolicy와 Booking을 분리했는가?
- CostBreakdown을 별도 PlanItem으로 만들지 않았는가?
- OptionGroup이 대체 계획을 담당하는가?
- Scenario를 Option과 혼동하지 않았는가?
- 계획과 실제 Execution을 분리했는가?
- 메뉴마다 같은 데이터를 중복 저장하지 않았는가?
- Derived 값을 불필요하게 원본 Store에 저장하지 않았는가?

---

# 17. Phase별 Agent 역할

| Phase         | Local Qwen  | Codex                   |
| ------------- | ----------- | ----------------------- |
| Repo Audit    | 분석/문서화 | 결과 검증               |
| Domain Types  | 구현        | 타입/관계 검증          |
| Store         | 구현        | 정규화 검증             |
| Migration     | 구현/테스트 | 데이터 손실 검증        |
| Selectors     | 구현/테스트 | View 중복 검증          |
| Multi Project | 구현        | Route/State 검증        |
| Booking       | 구현        | Domain 검증             |
| Cost          | 구현        | 집계/Breakdown 검증     |
| OptionGroup   | 구현        | 대체 구조 검증          |
| Preview       | 구현        | 영향 계산 검증          |
| Simulation    | 구현        | deterministic 여부 검증 |
| LIVE          | 구현        | 계획/실제 분리 검증     |
| Sharing       | 구현        | privacy boundary 검증   |

---

# 18. Local Agent에 적합한 작업

Local Qwen에 적극적으로 맡긴다.

```text
type 정의
schema 생성
migration mapping
selectors
unit tests
repetitive component wiring
form field 추가
route 추가
CRUD
documentation
test fixture
mock data
```

---

# 19. Codex에 남길 작업

가능하면 Codex는 다음에 집중한다.

```text
architecture
cross-domain relationship
migration safety
subtle state bug
option switching semantics
cost accounting semantics
simulation correctness
LIVE state transitions
privacy boundary
review
```

---

# 20. Repository Context 최소화 전략

Local Agent는 Repository 전체를 읽어도 되지만 Codex는 단계별로 최소 context만 받는다.

Codex가 매번 알아야 하는 것은:

```text
현재 Phase
현재 Task
변경 파일
테스트 결과
남은 Risk
```

뿐이다.

이를 `HANDOFF.md`로 유지한다.

---

# 21. 권장 실제 Workflow

```text
1. Codex:
   CURRENT_TASK.md 작성

2. OpenCode + Local Qwen:
   CURRENT_TASK 수행

3. Local Qwen:
   build/lint/test
   HANDOFF.md 갱신

4. Codex:
   HANDOFF + diff 검토

5. 실패:
   수정 Task 작성
   → Local Qwen 재작업

6. 성공:
   Commit 승인
   다음 Phase Task 작성
```

---

# 22. 첫 작업

현재 Repository에서 바로 시작할 첫 Task는 다음이다.

```text
Phase 0 — Repository Audit
```

아직 Domain refactor를 시작하지 않는다.

먼저 현재 사용자가 수정한 디자인과 코드 구조를 문서화한다.

첫 산출물:

```text
docs/agent/CURRENT_ARCHITECTURE.md
```

그 다음 Codex가 이를 검토하고 Phase 1을 지시한다.

---

# 23. 최종 원칙

```text
Local Qwen = 손
Codex      = 설계/감독/검증
Git        = 안전장치
Tests      = 객관적 판정
Docs       = Agent 간 기억
```

Codex가 구현 내용을 매번 처음부터 다시 이해하지 않게 만드는 것이 토큰 절약의 핵심이다.

따라서:

```text
CURRENT_TASK.md
HANDOFF.md
CURRENT_ARCHITECTURE.md
```

세 파일을 Agent 간 표준 인터페이스로 사용한다.
