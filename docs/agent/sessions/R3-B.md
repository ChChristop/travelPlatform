# R3-B Handoff — Migration Tests & Fixtures

## Summary
Implemented independent test suite and fixtures for the R3 migration. All 16 tests pass via `node --experimental-strip-types --test`.

## Files Created
- `fixtures/migrations/fixtures.ts`: Test fixtures covering valid events (with/without coords), lodging, confirmed/ambiguous bookings, invalid events/todos, and valid todos.
- `tests/migrations/migrate.test.ts`: 8 tests covering all required scenarios:
  1. Valid event → correct PlanItemType/PlanItem
  2. Event without coordinates → safe handling, no error
  3. Multi-day lodging → single PlanItem with period schedule
  4. Confirmed reservation → Booking created
  5. Ambiguous reservation → No Booking, text preserved in BookingPolicy
  6. Invalid event → unresolved (no throw)
  7. Valid todo → Task created
  8. Invalid todo → unresolved (no throw)
- `tests/migrations/idempotency.test.ts`: 8 tests verifying that identical inputs produce identical outputs for idMap, provenance, unresolved, planItems, places, bookings, tasks, and inputHash.

## Validation Results
- `runtime` validation: **PASS** (16/16 tests passed, 0 failures)
- All required scenarios from CURRENT_TASK are covered by fixtures and tests.

## Notes
- Tests import from `src/domain/migrations/migrate.ts` (A's implementation) and `fixtures/migrations/fixtures.ts`.
- No modifications to existing source files, UI, or localStorage.
- Idempotency verified by deep-equal comparison of all output fields across two runs with identical input.
