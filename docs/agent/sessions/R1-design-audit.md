# R1 Domain Types Conformance Audit Report

## 1. Workspace
- **Status**: MATCH
- **Details**: `src/domain/workspace.ts` (L3-9) matches design doc (L159-166). Fields `id`, `ownerId`, `projectIds`, `templateIds`, `collectionIds` are present with correct branded ID types.

## 2. TravelProject
- **Status**: MATCH
- **Details**: `src/domain/project.ts` (L3-19) matches design doc (L203-234). All fields including `source` union are present. `startDate`/`endDate` use `ISODate` alias which is consistent with ADR-0001.

## 3. Place / PlaceReference
- **Status**: MATCH
- **Details**: 
  - `Place` (`src/domain/place.ts` L3-26) matches design doc (L396-424) plus approved `workspaceId` addition (ADR-0001 L11).
  - `PlaceReference` (`src/domain/place.ts` L28-31) matches design doc (L436-444).

## 4. PlanVersion
- **Status**: MATCH
- **Details**: `src/domain/plan.ts` (L112-120) matches design doc (L244-258). All fields present.

## 5. PlanItem (and Details)
- **Status**: MATCH
- **Details**: 
  - `PlanItem` union (`src/domain/plan.ts` L100-110) correctly implements the 10 type/detail variants as a discriminated union, enforcing type/detail consistency.
  - `LodgingDetail` (`src/domain/plan.ts` L28-37) matches design doc (L489-501).
  - Other details (`MealDetail`, etc.) are minimal discriminator-only types as per ADR-0001 L10 and CURRENT_TASK L13.
  - `PlanItemBase` includes `routeIds` (L97) as per ADR-0001 L11.
  - `Schedule` (`src/domain/plan.ts` L17-26) matches design doc (L341-356).

## 6. BookingPolicy
- **Status**: MATCH
- **Details**: `src/domain/booking-policy.ts` (L1-5) matches design doc (L517-530).

## 7. Booking
- **Status**: MATCH
- **Details**: `src/domain/booking.ts` (L20-35) matches design doc (L551-589) plus approved `projectId` addition (ADR-0001 L11). All enum members for `type` and `status` are present.

## 8. CostRecord / CostBreakdown / CostSubject
- **Status**: MATCH
- **Details**: 
  - `CostRecord` (`src/domain/cost.ts` L31-44) matches design doc (L630-667) plus approved `projectId` addition.
  - `CostSubject` (`src/domain/cost.ts` L16-20) is a discriminated union matching the design doc's `subject` structure (L633-641) with branded IDs.
  - `CostBreakdown` (`src/domain/cost.ts` L24-29) matches design doc (L679-693).
  - `Money` (`src/domain/money.ts` L3-6) matches design doc (L623-626).

## 9. Route / RouteLeg
- **Status**: MATCH
- **Details**: 
  - `Route` (`src/domain/route.ts` L14-24) matches design doc (L1088-1110) plus approved `planVersionId` addition.
  - `RouteLeg` (`src/domain/route.ts` L5-12) is a value object as per ADR-0001 L13, containing `fromPlaceId`, `toPlaceId`, `mode`, and optional fields. This is an approved deviation from treating it as a full entity.

## 10. Task / Trigger
- **Status**: MATCH
- **Details**: 
  - `Task` (`src/domain/task.ts` L11-18) matches design doc (L1124-1137) plus approved `projectId` addition.
  - `Trigger` (`src/domain/task.ts` L5-9) matches design doc (L1145-1163) exactly.

## 11. PlanFragment / PlanOption / OptionGroup
- **Status**: MATCH
- **Details**: 
  - `PlanFragment` (`src/domain/alternatives.ts` L3-11) matches design doc (L871-882) plus approved `planVersionId`.
  - `PlanOption` (`src/domain/alternatives.ts` L13-20) matches design doc (L906-916) plus approved `planVersionId`.
  - `OptionGroup` (`src/domain/alternatives.ts` L22-28) matches design doc (L894-902) plus approved `planVersionId`.

## 12. Scenario / Constraint
- **Status**: MATCH
- **Details**: 
  - `Scenario` (`src/domain/scenario.ts` L5-15) matches design doc (L1012-1031) plus approved `planVersionId`. `variables` is `Record<string, unknown>` as per ADR-0001 L15.
  - `Constraint` (`src/domain/scenario.ts` L32-39) matches design doc (L1043-1066) plus approved `planVersionId`. `subjectId` is narrowed to `PlanItemId` as per ADR-0001 L14. `value` is `unknown` as per ADR-0001 L15.

## 13. TripRun / ItemExecution
- **Status**: MATCH
- **Details**: 
  - `TripRun` (`src/domain/run.ts` L5-12) matches design doc (L1204-1218).
  - `ItemExecution` (`src/domain/run.ts` L16-24) matches design doc (L1226-1242).

## 14. Money / PaymentInfo
- **Status**: MATCH
- **Details**: 
  - `Money` (`src/domain/money.ts` L3-6) matches design doc (L623-626).
  - `PaymentInfo` (`src/domain/money.ts` L8-13) matches design doc (L848-859). `methodId` and `payerId` use branded IDs as per ADR-0001 L12.

## Verdict
결함 없음