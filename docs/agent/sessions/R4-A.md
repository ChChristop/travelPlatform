# R4-A Handoff — Selectors

## Scope
Implemented pure selector functions in `src/store/selectors/` that read from `EntityState` (R2) without mutation.

## Files Created
- `src/store/selectors/timeline.ts` — `selectByDay(state, timezone)`
- `src/store/selectors/geo.ts` — `selectByCity(state)`
- `src/store/selectors/type.ts` — `selectByType(state)`
- `src/store/selectors/index.ts` — re-exports
- `tests/selectors/timeline.test.ts` — 7 tests
- `tests/selectors/geo.test.ts` — 5 tests
- `tests/selectors/type.test.ts` — 5 tests

## Key Implementation Details

### selectByDay
- Uses `Intl.DateTimeFormat` with `en-CA` locale and the provided IANA timezone to convert `schedule.start` to a calendar date (YYYY-MM-DD).
- Multi-day items (e.g., lodging with `start` and `end` on different dates) appear in every day bucket from start to end inclusive, as the **same object reference** (not a copy).
- Items without `schedule.start` are collected under the `'unscheduled'` key.
- Days are sorted ascending; `'unscheduled'` is placed last.
- Items within each day are sorted by `schedule.start` ascending (ties broken by id).

### selectByCity
- Resolves city via `places[0].placeId` → `state.places` lookup → `Place.region?.city`.
- Missing places, missing placeId, or missing city all map to `'unknown'`.
- Cities sorted alphabetically; `'unknown'` last.

### selectByType
- Groups by `PlanItem.type`.
- Only types actually present in the state are returned.
- Items within each type sorted by `schedule.start` ascending.

## Immutability
All three selectors create new arrays for buckets but never mutate `state` or its nested arrays/objects. The `PlanItem` references in the output are the exact same objects from `state.planItems`.

## Validation Results
- **scope** (tsc): PASS (exit 0)
- **runtime** (node --experimental-strip-types --test tests/selectors/*.test.ts): PASS — 17/17 tests passed

## Notes for Codex
- No changes to `src/domain/**`, `src/store/entities/**`, or any existing files.
- The selectors are pure functions with no side effects.
- `Intl.DateTimeFormat` is used for timezone-aware date conversion; this is available in Node 22.
- The `en-CA` locale produces YYYY-MM-DD format directly from `formatToParts`.
