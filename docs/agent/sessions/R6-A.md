# R6-A Handoff: Cost Command Validation & Integrity

## Summary
Implemented strict validation in `addCostRecord` (`src/store/commands/cost.ts`) to ensure project existence, subject reference integrity (including cross-project checks for planItems/bookings), and financial data validity (finite non-negative amounts, matching currencies, breakdown sum limits). Updated `tests/commands/booking-cost-task.test.ts` to cover missing subject, cross-project planItem, invalid amounts, and valid record scenarios. All 25 command tests pass.

## Changes
1. **`src/store/commands/cost.ts`**:
   - `addCostRecord` now validates:
     - Project existence in state.
     - Subject type validity and existence in corresponding state arrays.
     - Project consistency for `planItem` (via planVersion linkage) and `booking`.
     - Financial data: `total.amount` finite and >= 0, `total.currency` non-empty.
     - Breakdown items: valid money, matching currency, sum <= total amount.
   - `aggregateCosts` remains unchanged.

2. **`tests/commands/booking-cost-task.test.ts`**:
   - Updated `addCostRecord returns full EntityState and rejects duplicates` to include a valid planItem in state.
   - Added `addCostRecord rejects missing subject`.
   - Added `addCostRecord rejects cross-project planItem`.
   - Added `addCostRecord rejects invalid amount` (negative and NaN).
   - Added `addCostRecord succeeds with valid record`.

## Validation Results
- **Scope**: PASS
- **Runtime**: PASS (25/25 tests passed)

## Notes
- No changes to `aggregateCosts`.
- Immutable success pattern preserved.
- No `any` types used.
- No new dependencies added.
