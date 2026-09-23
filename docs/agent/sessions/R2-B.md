# R2-B Handoff — Runtime Tests & Fixtures

## Summary
Implemented independent runtime unit tests for the normalized state factory and validation rules. All 37 tests pass via `node --experimental-strip-types --test`.

## Files Written
- `tests/domain/runtime/fixtures.ts`: `createValidStateInput()` returning a fully valid `StateFactoryInput` with one project, plan version, place, plan item, cost record, option group, two plan options, one fragment, one trip run, and one item execution. All branded ID literals are cast to their specific types (`ProjectId`, `WorkspaceId`, `PlanVersionId`, `PlanItemId`, `PlaceId`, `CostRecordId`, `OptionGroupId`, `PlanOptionId`, `PlanFragmentId`, `TripRunId`, `ItemExecutionId`) following the R1 convention from `tests/domain/contracts.type-test.ts`.
- `tests/domain/runtime/state.test.ts`: 15 tests covering the `createEntityState` factory — valid state, duplicate IDs, dangling references (place, planVersion, costRecord subject), ownership mismatch, option-not-in-group, invalid date order (schedule, tripRun, itemExecution), non-finite/negative money, invalid lat/lng, and multi-error collection.
- `tests/domain/runtime/validation.test.ts`: 22 tests covering `validateReferenceRules` (valid, 4 duplicate-ID cases, 3 dangling-ref cases, ownership mismatch) and `validateValueRules` (valid, option-not-in-group, 3 date-order cases, 4 money finiteness cases, 4 coordinate finiteness/range cases, multi-error collection).

## Corrective Task Applied
Replaced all 36 `as any` casts across the three files with specific branded ID type casts. Each literal is cast directly to the one branded type it represents (e.g. `'proj-1' as ProjectId`, `'pi-1' as PlanItemId`). No `as any`, no double-casts, no weakening of any src/domain or store type.

## Validation
- `runtime` (node --experimental-strip-types --test tests/domain/runtime/*.test.ts): **PASS** — 37/37 tests pass, 0 fail.

## Notes
- No changes to `src/domain/**`, `src/store/entities/**`, or any other protected files.
- No new npm dependencies added.
- Tests exercise behavior only; the cast change required no assertion modifications.
