# ADR-0001 — 기존 앱 보존과 Domain 우선 신규 앱

상태: 채택 / 2026-09-23. 사용자 승인 방향을 구체화한 Codex 설계 결정.

## 배경과 결정
기존 앱은 UI/시간/지도/정적 데이터 결합이 강하다. 기존 화면을 계속 새 모델에 맞추기보다 기존 앱을 보존하고 신규 Domain → 검증된 migration → 별도 새 UI 순서로 진행한다. 새 앱은 Domain Selector를 사용하며 legacy shape를 장기 공용 API로 삼지 않는다. 공존 entry와 가역적인 전환은 EXECUTION_SPEC에 정의한다.

## 타입 계약 보완
- string 기반 branded EntityId<K>로 서로 다른 종류의 ID 혼용을 거부한다. JSON 직렬화는 string이며 신뢰 경계에서 runtime 검증 후 부여해야 한다.
- PlanItem은 10개 type/detail 조합의 union이다. LodgingDetail은 설계 필드를 유지하고 나머지 미정 detail은 discriminator만 정의한다. 임의 필수 필드는 추가하지 않는다.
- PlanItem.routeIds로 경로 참조를 명시한다. Place.workspaceId, Booking/CostRecord/Task.projectId, Route/PlanFragment/PlanOption/OptionGroup/Scenario/Constraint.planVersionId를 필수화한다. 이는 설계 예시에서 빠진 소유 경계를 보완한다.
- CostSubject는 type과 해당 ID brand의 결합 union. PaymentInfo는 money.ts에서 공유하여 비용 모듈에 복제하지 않는다.
- RouteLeg는 독립 ID가 없는 값 객체다. fromPlaceId/toPlaceId/mode와 optional durationMinutes/distanceMeters/geometry를 가진다.
- Constraint.subjectId는 우선 PlanItemId로 제한한다. 다른 subject가 필요하면 구체적 union으로 확장한다.
- ISODate/ISODateTime은 의미를 표시하는 string alias다. 유효 날짜, 시간 순서, timezone, 유한 금액, 실제 ID 존재 및 프로젝트/버전 소유 일치는 runtime 검증 책임이다.

## 불변조건
기존 앱 삭제·폐기는 추후 사용자 명시적 확인이 필수다. 새 앱 완료/기본 화면 전환/검증 PASS로 승인된 것으로 간주하지 않는다.

PlanItem은 의미 단위이고 날짜는 View dimension이다. Place/BookingPolicy/Booking/CostBreakdown/Task/실제 실행을 분리한다. Option 변경은 Preview 후 Commit. SIM은 실제 계획과 실행 기록을 변경하지 않는다. 현재 시계는 실제 여행의 증거가 아니다.

## 대안과 tradeoff
- 기존 UI Adapter 중심 점진 전환: 초기 화면 재사용은 쉽지만 old shape를 유지하는 비용이 커져 기본 전략에서 제외. 필요한 legacy 입력 migration adapter는 유지한다.
- 일괄 교체: 데이터 의미 손실과 UI 회귀 위험 때문에 제외.
- JSDoc만 도입: 기존 JS와 친화적이나 ID/union 계약 검증을 위해 격리된 TypeScript를 선택. 기존 앱 TS 전환은 하지 않는다.
- 모든 detail 업무 필드 선설계: 확인되지 않은 필드를 고정하지 않고 실제 기능 단계에서 보완한다.

신규 앱 공존으로 단기간 유지 대상이 늘지만, 기존 앱이 계속 동작하는 상태에서 데이터 무결성과 새 흐름을 검증할 수 있다. 기존 디자인의 재사용 범위는 새 UI 단계에서 결정하며 기존 코드 재작성 자체를 목표로 하지 않는다.

## 검증과 다음 단계
R1 strict type contract + 기존 build. R2부터 runtime 무결성 검증. R3에서 provenance/멱등성/원문 보존 검증 전에는 기존 저장값을 변경하지 않는다. 타입 성공을 migration 성공으로 표현하지 않는다.

참조: [실행 명세](../EXECUTION_SPEC.md), [원래 설계](../../travel-platform-domain-design.md), [legacy 감사](../agent/CURRENT_ARCHITECTURE.md).
