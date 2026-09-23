import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveState, loadState, exportState, importState, ENVELOPE_VERSION } from '../../src/persistence/index.ts';
import type { StorageAdapter } from '../../src/persistence/index.ts';
import type { EntityState } from '../../src/store/entities/state.ts';
import type { TravelProject } from '../../src/domain/project.ts';
import type { PlanVersion, PlanItem } from '../../src/domain/plan.ts';
import type { Place } from '../../src/domain/place.ts';

function makeValidState(): EntityState {
  const project: TravelProject = {
    id: 'proj-1',
    workspaceId: 'ws-1',
    title: 'Test Trip',
    timezone: 'Asia/Tokyo',
    status: 'planning',
    visibility: 'private',
  };
  const planVersion: PlanVersion = {
    id: 'pv-1',
    projectId: 'proj-1',
    version: 1,
    status: 'draft',
    createdAt: '2026-09-23T00:00:00.000Z',
  };
  const place: Place = {
    id: 'place-1',
    workspaceId: 'ws-1',
    name: 'Osaka',
    region: { city: 'Osaka' },
  };
  const planItem: PlanItem = {
    id: 'item-1',
    planVersionId: 'pv-1',
    type: 'meal',
    title: 'Lunch',
    schedule: { start: '2026-09-26T12:00:00.000Z' },
    places: [{ placeId: 'place-1', role: 'primary' }],
    detail: { type: 'meal' },
    status: 'planned',
  };

  return {
    projects: [project],
    planVersions: [planVersion],
    planItems: [planItem],
    places: [place],
    bookings: [],
    costRecords: [],
    routes: [],
    tasks: [],
    planFragments: [],
    planOptions: [],
    optionGroups: [],
    scenarios: [],
    constraints: [],
    tripRuns: [],
    itemExecutions: [],
  };
}

function makeFakeStorage(initialValue?: string): StorageAdapter & { stored: Map<string, string> } {
  const stored = new Map<string, string>();
  if (initialValue !== undefined) {
    stored.set('test-key', initialValue);
  }
  return {
    stored,
    getItem(key: string): string | null {
      return stored.has(key) ? stored.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      stored.set(key, value);
    },
    removeItem(key: string): void {
      stored.delete(key);
    },
  };
}

test('Roundtrip: saveState then loadState returns deep-equal state', () => {
  const state = makeValidState();
  const storage = makeFakeStorage();

  const saveResult = saveState(storage, 'test-key', state);
  assert.equal(saveResult.ok, true);

  const loadResult = loadState(storage, 'test-key');
  assert.equal(loadResult.ok, true);
  if (loadResult.ok) {
    assert.deepEqual(loadResult.data, state);
  }
});

test('Corrupted data: loadState returns error and does not modify storage', () => {
  const corruptedJson = '{"version":1,"savedAt":"2026-09-23T00:00:00.000Z","data":{"projects":["invalid"]}}';
  const storage = makeFakeStorage(corruptedJson);

  const loadResult = loadState(storage, 'test-key');
  assert.equal(loadResult.ok, false);
  if (!loadResult.ok) {
    assert.ok(loadResult.error.length > 0);
  }

  // Original value must remain in storage
  assert.equal(storage.getItem('test-key'), corruptedJson);
});

test('Invalid JSON: loadState returns error and does not modify storage', () => {
  const invalidJson = 'not-valid-json';
  const storage = makeFakeStorage(invalidJson);

  const loadResult = loadState(storage, 'test-key');
  assert.equal(loadResult.ok, false);
  if (!loadResult.ok) {
    assert.ok(loadResult.error.includes('Invalid JSON'));
  }

  assert.equal(storage.getItem('test-key'), invalidJson);
});

test('Version mismatch: loadState returns error with clear reason', () => {
  const wrongVersionJson = JSON.stringify({
    version: 999,
    savedAt: '2026-09-23T00:00:00.000Z',
    data: makeValidState(),
  });
  const storage = makeFakeStorage(wrongVersionJson);

  const loadResult = loadState(storage, 'test-key');
  assert.equal(loadResult.ok, false);
  if (!loadResult.ok) {
    assert.ok(loadResult.error.includes('Unsupported envelope version'));
    assert.ok(loadResult.error.includes('999'));
  }

  assert.equal(storage.getItem('test-key'), wrongVersionJson);
});

test('Save failure: original value remains in storage', () => {
  const originalState = makeValidState();
  const originalJson = JSON.stringify({
    version: ENVELOPE_VERSION,
    savedAt: '2026-09-23T00:00:00.000Z',
    data: originalState,
  });

  const storage = makeFakeStorage(originalJson);

  // Create a storage adapter that throws on setItem
  const throwingStorage: StorageAdapter = {
    getItem(key: string): string | null {
      return storage.getItem(key);
    },
    setItem(key: string, value: string): void {
      throw new Error('QuotaExceededError: Storage quota exceeded');
    },
    removeItem(key: string): void {
      storage.removeItem(key);
    },
  };

  const newState = makeValidState();
  const saveResult = saveState(throwingStorage, 'test-key', newState);
  assert.equal(saveResult.ok, false);
  if (!saveResult.ok) {
    assert.ok(saveResult.error.includes('QuotaExceededError'));
  }

  // Original value must still be readable
  const originalRead = storage.getItem('test-key');
  assert.equal(originalRead, originalJson);
});

test('Semantic validation: loadState rejects invalid state', () => {
  // Create a state with a dangling reference (planItem references non-existent place)
  const invalidState: EntityState = {
    projects: [],
    planVersions: [],
    planItems: [
      {
        id: 'item-1',
        planVersionId: 'pv-1',
        type: 'meal',
        title: 'Lunch',
        schedule: { start: '2026-09-26T12:00:00.000Z' },
        places: [{ placeId: 'non-existent-place', role: 'primary' }],
        detail: { type: 'meal' },
        status: 'planned',
      },
    ],
    places: [],
    bookings: [],
    costRecords: [],
    routes: [],
    tasks: [],
    planFragments: [],
    planOptions: [],
    optionGroups: [],
    scenarios: [],
    constraints: [],
    tripRuns: [],
    itemExecutions: [],
  };

  const json = JSON.stringify({
    version: ENVELOPE_VERSION,
    savedAt: '2026-09-23T00:00:00.000Z',
    data: invalidState,
  });
  const storage = makeFakeStorage(json);

  const loadResult = loadState(storage, 'test-key');
  assert.equal(loadResult.ok, false);
  if (!loadResult.ok) {
    assert.ok(loadResult.error.includes('Validation failed'));
  }

  // Original value remains
  assert.equal(storage.getItem('test-key'), json);
});

test('Repeated import safety: same exportState string imported twice yields deep-equal state', () => {
  const state = makeValidState();
  const exported = exportState(state);

  const result1 = importState(exported);
  assert.equal(result1.ok, true);

  const result2 = importState(exported);
  assert.equal(result2.ok, true);

  if (result1.ok && result2.ok) {
    assert.deepEqual(result1.data, result2.data);
  }
});

test('exportState produces valid JSON that importState can parse', () => {
  const state = makeValidState();
  const exported = exportState(state);

  const parsed = JSON.parse(exported);
  assert.equal(parsed.version, ENVELOPE_VERSION);
  assert.equal(typeof parsed.savedAt, 'string');
  assert.deepEqual(parsed.data, state);

  const result = importState(exported);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data, state);
  }
});

test('loadState with no data returns error', () => {
  const storage = makeFakeStorage();
  const loadResult = loadState(storage, 'non-existent-key');
  assert.equal(loadResult.ok, false);
  if (!loadResult.ok) {
    assert.ok(loadResult.error.includes('No data found'));
  }
});
