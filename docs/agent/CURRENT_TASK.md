# R7 Deterministic SIM Implementation Plan

## 1. Context & Status
*   **Current State:** R6 committed (`d8007c6`).
*   **User Directive:** Proceed to next stage (R7).
*   **Scope:** Deterministic Simulation Engine + Standalone UI.
*   **Constraint:** No new npm dependencies. No legacy `src/App.jsx` edits. No auto-writes to persistence.

## 2. Strict Scope Definition
**Allowed Files:**
*   `src/simulation/**` (New: Pure Engine)
*   `tests/simulation/**` (New: Unit Tests)
*   `src/platform/features/simulation/**` (New: UI Components)
*   `src/platform/PlatformApp.jsx` (Integration: View Switching)
*   `src/platform/Shell.jsx` (Integration: Nav/Context)
*   `src/platform/platform.css` (Integration: Styles)

**Forbidden Files:**
*   `src/App.jsx` (Legacy)
*   `src/**/ClockPanel.jsx` (Legacy)
*   `src/**/mapTracking/**` (Legacy)
*   `src/**/AGENT_WORKFLOW/**` (Legacy)
*   `src/**/dataSource/**` (Legacy)
*   `src/**/persistence/**` (Legacy)
*   `src/**/domain/**` (Legacy Types)
*   `src/**/booking/**` (Legacy)
*   `src/**/costs/**` (Legacy)
*   `src/**/tripRun/**` (Legacy)
*   Any user-owned edits outside the allowed scope.

## 3. Execution Strategy (Sequential Local Qwen Sessions)
To prevent concurrent file conflicts, execution is split into two sequential sessions.

### Session A: Engine & Tests
**Goal:** Implement pure deterministic simulation engine and comprehensive unit tests.
**Files to Create/Modify:**
1.  `src/simulation/engine.ts`:
    *   **State Structure:** Immutable state object containing `clock`, `scenario` (domain `Scenario` with `optionSelections` and `variables`), `seed`, `entityState` (from `src/store/entities/state.ts`), `currentLocation`, `nextLocation`, `warnings`.
    *   **Core Functions:**
        *   `createInitialState(config)`: Initializes state with explicit clock, scenario, seed.
        *   `tick(state, delta)`: Pure function. Advances clock by `delta`. Returns new state.
        *   `applyScenario(state, scenario)`: Applies scenario logic (e.g., delays) without mutating input.
        *   `projectOptions(state, optionSelections)`: Projects active options based on scenario selections. Does not mutate `state.optionSelections` directly; returns projected view.
        *   `getWarnings(state)`: Returns constraint/route warnings if supported by scenario.
    *   **Clock Controls (Pure Helpers):**
        *   `play(state)`: Returns state with `isPlaying: true`.
        *   `pause(state)`: Returns state with `isPlaying: false`.
        *   `setSpeed(state, speed)`: Returns state with updated speed.
        *   `scrub(state, time)`: Returns state with clock set to `time` (bounded).
    *   **Bounded Time:** Ensure clock does not exceed latest scheduled end or go below earliest scheduled start. Never use arbitrary 0.
2.  `tests/simulation/engine.test.ts`:
    *   **Imports:** Import real engine from `src/simulation/engine`.
    *   **Fixtures:** Use valid domain fixtures for `Scenario` and `EntityState`.
    *   **Determinism:** Same inputs (clock, scenario, seed) => Same output.
    *   **Immutability:** Input state is not mutated.
    *   **Clock Controls:**
        *   `play`/`pause` toggles `isPlaying`.
        *   `setSpeed` updates speed.
        *   `scrub` sets time within bounds.
        *   Bounds: Scrubbing beyond max/min clamps to bounds (earliest start / latest end).
    *   **Scenario Logic:**
        *   Delay scenario: Verify delay is applied to projected time/location.
        *   Option Override: Verify `optionSelections` override scenario defaults in projection.
    *   **Warnings:** Verify warnings are generated for constraint violations.

### Session B: UI & Integration
**Goal:** Implement standalone simulation view and integrate into platform.
**Files to Create/Modify:**
1.  `src/platform/features/simulation/SimulationView.jsx`:
    *   **State Management:** Local state only (ephemeral session). No Redux/Context writes to persistence.
    *   **Components:**
        *   Clock Display (Current/Next Time).
        *   Location Display (Current/Next Location).
        *   Controls: Play/Pause, Speed Selector, Scrub Slider.
        *   Scenario Selector (if applicable).
        *   Warnings Panel.
    *   **Logic:**
        *   Use `useEffect` or `requestAnimationFrame` to drive `tick` when `isPlaying`.
        *   Call pure engine functions from `src/simulation/engine`.
        *   No GPS promotion. No auto-writes to `PlanVersion`, `Booking`, `TripRun`.
2.  `src/platform/PlatformApp.jsx`:
    *   Add in-memory view name logic for Simulation View.
    *   Import `SimulationView`.
    *   **Note:** No URL router changes. No `/simulation` route.
3.  `src/platform/Shell.jsx`:
    *   Add navigation link to Simulation View.
4.  `src/platform/platform.css`:
    *   Add styles for simulation controls, clock display, warnings.

## 4. Verification & Completion
1.  **Typecheck:** Run `tsc --noEmit --strict --allowImportingTsExtensions --moduleResolution bundler --module esnext --target es2022 --lib "es2022,dom"` on engine entry.
2.  **Tests:** Run `node --experimental-strip-types tests/simulation/engine.test.ts` to ensure all tests pass.
3.  **Build:** Run `npm run build` to ensure no build errors.
4.  **UI Visual Check:**
    *   If browser accessible: Verify UI renders, controls work, no console errors.
    *   If not accessible: Record limitation in WORKLOG.
5.  **Commit:**
    *   Commit message: `R7: Deterministic SIM engine and standalone UI`
    *   No push.
6.  **Handoff:**
    *   Update `docs/agent/CURRENT_TASK.md` with completion status.
    *   Explicitly state: **R8 not started.**

## 5. Handoff / Worklog
*   **R7 Status:** In Progress (Session A: Engine & Tests).
*   **Next Steps:**
    1.  Implement `src/simulation/engine.ts`.
    2.  Implement `tests/simulation/engine.test.ts`.
    3.  Run typecheck and tests.
    4.  Proceed to Session B (UI & Integration).
*   **R8 Status:** Not started.