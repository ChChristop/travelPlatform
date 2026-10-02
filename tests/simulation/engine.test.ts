import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  tick,
  play,
  pause,
  setSpeed,
  scrub,
  applyScenario,
  getSnapshot,
  projectOptions,
  type SimulationConfig,
  type SimulationSession
} from '../../src/simulation/engine.ts';
import type { EntityState } from '../../src/store/entities/state.ts';
import type { Scenario, Constraint } from '../../src/domain/scenario.ts';
import type { PlanItem, PlanVersion } from '../../src/domain/plan.ts';
import type { Place } from '../../src/domain/place.ts';
import type { Route } from '../../src/domain/route.ts';
import type { PlanFragment, PlanOption, OptionGroup } from '../../src/domain/alternatives.ts';
import type {
  PlanItemId,
  PlanVersionId,
  PlaceId,
  RouteId,
  OptionGroupId,
  PlanOptionId,
  PlanFragmentId,
  ScenarioId,
  ConstraintId,
  WorkspaceId,
  ProjectId
} from '../../src/domain/ids.ts';

// Helper to cast branded IDs
const asId = <T>(v: string): T => v as T;

// Fixtures
const PV_ID = asId<PlanVersionId>('pv-1');
const ITEM_A_ID = asId<PlanItemId>('item-a');
const ITEM_B_ID = asId<PlanItemId>('item-b');
const PLACE_A_ID = asId<PlaceId>('place-a');
const PLACE_B_ID = asId<PlaceId>('place-b');
const ROUTE_A_ID = asId<RouteId>('route-a');
const ROUTE_B_ID = asId<RouteId>('route-b');
const GROUP_1_ID = asId<OptionGroupId>('group-1');
const OPT_1_ID = asId<PlanOptionId>('opt-1');
const OPT_2_ID = asId<PlanOptionId>('opt-2');
const FRAG_1_ID = asId<PlanFragmentId>('frag-1');
const FRAG_2_ID = asId<PlanFragmentId>('frag-2');
const SCEN_1_ID = asId<ScenarioId>('scen-1');
const CONST_1_ID = asId<ConstraintId>('const-1');
const WS_ID = asId<WorkspaceId>('ws-1');
const PROJ_ID = asId<ProjectId>('proj-1');

const placeA: Place = {
  id: PLACE_A_ID,
  workspaceId: WS_ID,
  name: 'Place A'
};

const placeB: Place = {
  id: PLACE_B_ID,
  workspaceId: WS_ID,
  name: 'Place B'
};

const routeA: Route = {
  id: ROUTE_A_ID,
  planVersionId: PV_ID,
  plannedDurationMinutes: 30
};

const routeB: Route = {
  id: ROUTE_B_ID,
  planVersionId: PV_ID,
  plannedDurationMinutes: 0 // Unusable
};

const itemA: PlanItem = {
  id: ITEM_A_ID,
  planVersionId: PV_ID,
  title: 'Item A',
  type: 'attraction',
  detail: { type: 'attraction' },
  schedule: {
    start: '2023-01-01T10:00:00Z',
    end: '2023-01-01T12:00:00Z'
  },
  places: [{ placeId: PLACE_A_ID, role: 'primary' }],
  status: 'planned',
  routeIds: [ROUTE_A_ID]
};

const itemB: PlanItem = {
  id: ITEM_B_ID,
  planVersionId: PV_ID,
  title: 'Item B',
  type: 'meal',
  detail: { type: 'meal' },
  schedule: {
    start: '2023-01-01T13:00:00Z',
    end: '2023-01-01T14:00:00Z'
  },
  places: [{ placeId: PLACE_B_ID, role: 'primary' }],
  status: 'planned',
  routeIds: [ROUTE_B_ID]
};

const fragment1: PlanFragment = {
  id: FRAG_1_ID,
  planVersionId: PV_ID,
  planItemIds: [ITEM_A_ID, ITEM_B_ID]
};

const fragment2: PlanFragment = {
  id: FRAG_2_ID,
  planVersionId: PV_ID,
  planItemIds: [ITEM_A_ID] // Item B excluded
};

const option1: PlanOption = {
  id: OPT_1_ID,
  planVersionId: PV_ID,
  label: 'Option 1',
  fragmentId: FRAG_1_ID
};

const option2: PlanOption = {
  id: OPT_2_ID,
  planVersionId: PV_ID,
  label: 'Option 2',
  fragmentId: FRAG_2_ID
};

const group1: OptionGroup = {
  id: GROUP_1_ID,
  planVersionId: PV_ID,
  title: 'Group 1',
  optionIds: [OPT_1_ID, OPT_2_ID],
  selectedOptionId: OPT_1_ID
};

const constraint1: Constraint = {
  id: CONST_1_ID,
  planVersionId: PV_ID,
  subjectId: ITEM_A_ID,
  type: 'fixedTime',
  value: null,
  hardness: 'hard'
};

const baseState: EntityState = {
  projects: [],
  planVersions: [{
    id: PV_ID,
    projectId: PROJ_ID,
    version: 1,
    status: 'published',
    createdAt: '2023-01-01T00:00:00Z'
  }],
  planItems: [itemA, itemB],
  places: [placeA, placeB],
  bookings: [],
  costRecords: [],
  routes: [routeA, routeB],
  tasks: [],
  planFragments: [fragment1, fragment2],
  planOptions: [option1, option2],
  optionGroups: [group1],
  scenarios: [],
  constraints: [constraint1],
  tripRuns: [],
  itemExecutions: []
};

function createTestState(): EntityState {
  return JSON.parse(JSON.stringify(baseState));
}

describe('Simulation Engine', () => {
  test('deterministic identical snapshot for same explicit seed/clock/scenario', () => {
    const state1 = createTestState();
    const state2 = createTestState();

    const config1: SimulationConfig = {
      entityState: state1,
      planVersionId: PV_ID,
      seed: 42,
      initialClockMs: Date.parse('2023-01-01T10:30:00Z')
    };

    const config2: SimulationConfig = {
      entityState: state2,
      planVersionId: PV_ID,
      seed: 42,
      initialClockMs: Date.parse('2023-01-01T10:30:00Z')
    };

    const session1 = createInitialState(config1);
    const session2 = createInitialState(config2);

    const snap1 = getSnapshot(session1);
    const snap2 = getSnapshot(session2);

    assert.deepEqual(snap1, snap2);
  });

  test('source immutability (deep freeze source before simulation)', () => {
    const state = createTestState();
    Object.freeze(state);
    Object.freeze(state.planItems);
    state.planItems.forEach(i => Object.freeze(i));
    Object.freeze(state.optionGroups);
    state.optionGroups.forEach(g => Object.freeze(g));
    Object.freeze(state.routes);
    state.routes.forEach(r => Object.freeze(r));
    Object.freeze(state.places);
    state.places.forEach(p => Object.freeze(p));
    Object.freeze(state.constraints);
    state.constraints.forEach(c => Object.freeze(c));

    const config: SimulationConfig = {
      entityState: state,
      planVersionId: PV_ID,
      seed: 1
    };

    const session = createInitialState(config);
    const snap = getSnapshot(session);

    // Ensure no mutation occurred
    assert.equal(state.optionGroups[0].selectedOptionId, OPT_1_ID);
    assert.ok(snap.current);
  });

  test('play/pause/tick/speed/scrub/bounds and end pause', () => {
    const state = createTestState();
    const config: SimulationConfig = {
      entityState: state,
      planVersionId: PV_ID,
      seed: 1,
      initialClockMs: Date.parse('2023-01-01T10:00:00Z')
    };

    let session = createInitialState(config);
    assert.equal(session.playing, false);
    assert.equal(session.clockMs, Date.parse('2023-01-01T10:00:00Z'));

    // Play
    session = play(session);
    assert.equal(session.playing, true);

    // Tick 1 hour (3600000 ms) at speed 1
    session = tick(session, 3600000);
    assert.equal(session.clockMs, Date.parse('2023-01-01T11:00:00Z'));
    assert.equal(session.playing, true);

    // Set speed to 2
    session = setSpeed(session, 2);
    assert.equal(session.speed, 2);

    // Tick 1 hour real time -> 2 hours sim time
    session = tick(session, 3600000);
    assert.equal(session.clockMs, Date.parse('2023-01-01T13:00:00Z'));

    // Scrub to end
    const endMs = session.bounds.endMs;
    session = scrub(session, endMs);
    assert.equal(session.clockMs, endMs);

    // Tick should pause at end
    session = tick(session, 1000);
    assert.equal(session.playing, false);
    assert.equal(session.clockMs, endMs);

    // Pause
    session = play(session);
    session = pause(session);
    assert.equal(session.playing, false);
  });

  test('delay scenario projected start and fixedTime warning', () => {
    const state = createTestState();
    const scenario: Scenario = {
      id: SCEN_1_ID,
      planVersionId: PV_ID,
      title: 'Delay',
      type: 'delay',
      variables: { delayMinutes: 30 },
      optionSelections: []
    };

    const config: SimulationConfig = {
      entityState: state,
      planVersionId: PV_ID,
      scenario,
      seed: 1,
      initialClockMs: Date.parse('2023-01-01T10:00:00Z')
    };

    const session = createInitialState(config);
    const snap = getSnapshot(session);

    // Item A starts at 10:00, delayed by 30 mins -> 10:30
    // Clock is 10:00, so Item A is not current yet.
    // Next should be Item A (starts 10:30)
    assert.equal(snap.next?.id, ITEM_A_ID);
    assert.equal(snap.next?.startMs, Date.parse('2023-01-01T10:30:00Z'));

    // Check warnings for fixedTime
    const fixedTimeWarning = snap.warnings.find(w => w.type === 'fixedTime');
    assert.ok(fixedTimeWarning);
    assert.equal(fixedTimeWarning.itemId, ITEM_A_ID);
  });

  test('scenario option override changing current/next without mutating selectedOptionId', () => {
    const state = createTestState();
    // Default selection is OPT_1 (includes Item A and B)
    const scenario: Scenario = {
      id: SCEN_1_ID,
      planVersionId: PV_ID,
      title: 'Override',
      type: 'custom',
      variables: {},
      optionSelections: [
        { optionGroupId: GROUP_1_ID, optionId: OPT_2_ID } // OPT_2 only includes Item A
      ]
    };

    const config: SimulationConfig = {
      entityState: state,
      planVersionId: PV_ID,
      scenario,
      seed: 1,
      initialClockMs: Date.parse('2023-01-01T13:30:00Z') // During Item B time (13:00-14:00)
    };

    const session = createInitialState(config);
    const snap = getSnapshot(session);

    // Since OPT_2 excludes Item B, Item B should not be current.
    // Item A is 10:00-12:00, so it's past.
    // No items active at 13:30.
    assert.equal(snap.current, null);
    assert.equal(snap.next, null);

    // Ensure source state was not mutated
    assert.equal(state.optionGroups[0].selectedOptionId, OPT_1_ID);
  });

  test('invalid scenario/option rejection', () => {
    const state = createTestState();

    // Invalid optionId
    const badScenario: Scenario = {
      id: SCEN_1_ID,
      planVersionId: PV_ID,
      title: 'Bad',
      type: 'custom',
      variables: {},
      optionSelections: [
        { optionGroupId: GROUP_1_ID, optionId: asId<PlanOptionId>('invalid-opt') }
      ]
    };

    const config: SimulationConfig = {
      entityState: state,
      planVersionId: PV_ID,
      scenario: badScenario,
      seed: 1
    };

    assert.throws(() => createInitialState(config), /Invalid optionId/);

    // Test projectOptions validation
    const session = createInitialState({
      entityState: createTestState(),
      planVersionId: PV_ID,
      seed: 1
    });

    assert.throws(() => {
      projectOptions(session, [{ optionGroupId: GROUP_1_ID, optionId: asId<PlanOptionId>('invalid-opt') }]);
    }, /Invalid optionId/);
  });

  test('delayed end bound and start-only item behavior', () => {
    const state = createTestState();
    const itemC: PlanItem = {
      id: asId<PlanItemId>('item-c'),
      planVersionId: PV_ID,
      title: 'Item C',
      type: 'attraction',
      detail: { type: 'attraction' },
      schedule: {
        start: '2023-01-01T15:00:00Z'
      },
      places: [{ placeId: PLACE_A_ID, role: 'primary' }],
      status: 'planned'
    };
    state.planItems.push(itemC);

    const scenario: Scenario = {
      id: SCEN_1_ID,
      planVersionId: PV_ID,
      title: 'Delay',
      type: 'delay',
      variables: { delayMinutes: 60 },
      optionSelections: []
    };

    const config: SimulationConfig = {
      entityState: state,
      planVersionId: PV_ID,
      scenario,
      seed: 1
    };

    const session = createInitialState(config);

    // Item C starts at 15:00. Delay 60 mins -> 16:00.
    // Bounds end must be >= 16:00.
    assert.ok(session.bounds.endMs >= Date.parse('2023-01-01T16:00:00Z'));

    // Scrub to 16:00
    const session2 = scrub(session, Date.parse('2023-01-01T16:00:00Z'));
    const snap = getSnapshot(session2);

    // Item C should be current
    assert.equal(snap.current?.id, asId<PlanItemId>('item-c'));
  });

  test('route missing or unusable warnings', () => {
    const state = createTestState();

    // Item B has routeB which has duration 0 (unusable)
    const config: SimulationConfig = {
      entityState: state,
      planVersionId: PV_ID,
      seed: 1
    };

    const session = createInitialState(config);
    const snap = getSnapshot(session);

    const unusableWarning = snap.warnings.find(w => w.type === 'routeUnusable');
    assert.ok(unusableWarning);
    assert.equal(unusableWarning.itemId, ITEM_B_ID);
  });

  test('input validation', () => {
    const state = createTestState();

    // Invalid seed
    const config1: SimulationConfig = {
      entityState: state,
      planVersionId: PV_ID,
      seed: NaN
    };
    assert.throws(() => createInitialState(config1), /Seed must be a finite number/);

    // Invalid speed
    const config2: SimulationConfig = {
      entityState: state,
      planVersionId: PV_ID,
      seed: 1,
      initialSpeed: -1
    };
    assert.throws(() => createInitialState(config2), /Speed must be a finite positive number/);

    // No items
    const emptyState = createTestState();
    emptyState.planItems = [];
    const config3: SimulationConfig = {
      entityState: emptyState,
      planVersionId: PV_ID,
      seed: 1
    };
    assert.throws(() => createInitialState(config3), /No scheduled items found/);
  });
});