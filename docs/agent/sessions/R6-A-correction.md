# R6-A: Cost Command Validation & Integrity

**Scope:** `src/store/commands/cost.ts`, `tests/commands/booking-cost-task.test.ts`
**Constraint:** Do not modify `aggregateCosts`. Preserve immutable success pattern.

## 1. Implementation Requirements (`src/store/commands/cost.ts`)

Update `addCostRecord` to perform strict validation **before** returning a new `EntityState`. Reject invalid data or broken references immediately.

### Validation Logic
1.  **Project Existence**: `projectId` must exist in the state's project array.
2.  **Subject Reference Integrity**:
    *   `subject.type` must be one of: `planItem`, `booking`, `route`, `project`.
    *   **Existence**: The `subject.id` must exist in the corresponding state array (`planItems`, `bookings`, `routes`, `projects`).
    *   **Project Consistency**:
        *   `planItem`: Must belong to the same `projectId` (verify via `planVersion` linkage or direct `projectId` if present).
        *   `booking` / `project`: Must have matching `projectId`.
        *   `route`: If no explicit project linkage, verify existence only.
3.  **Financial Data**:
    *   `amount`: Must be a finite number and `>= 0`.
    *   `currency`: Must be a non-empty string.
    *   `breakdown` (if present):
        *   Each item's `money` must be valid.
        *   Each item's `currency` must match the main `currency`.
        *   Sum of breakdown items must not exceed the total `amount` (no double counting/over-allocation).

### Implementation Note
Use `createCostRecord` validation logic or equivalent inline checks. Ensure the function returns a new immutable `EntityState` on success.

## 2. Test Requirements (`tests/commands/booking-cost-task.test.ts`)

Add meaningful tests covering the following scenarios:

1.  **Missing Subject**: Attempt to add a cost for a `subject.id` that does not exist in the state. Expect rejection/error.
2.  **Cross-Project PlanItem**: Attempt to add a cost for a `planItem` belonging to a different `projectId` than the cost record. Expect rejection/error.
3.  **Invalid Amount**: Attempt to add a cost with a negative amount or non-finite value. Expect rejection/error.
4.  **Valid Record**: Add a cost with valid project, existing subject, correct project linkage, and valid financial data. Expect successful `EntityState` update.

## 3. Execution
- Run local tests to verify.
- Ensure no changes to `aggregateCosts`.
- Commit changes.
