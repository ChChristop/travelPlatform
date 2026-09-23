import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectByType } from '../../src/store/selectors/type.ts';
import type { EntityState } from '../../src/store/entities/state.ts';
import type { PlanItem, PlanItemType } from '../../src/domain/plan.ts';
import type { TravelProject } from '../../src/domain/project.ts';
import type { PlanVersion } from '../../src/domain/plan.ts';

function makeState(planItems: PlanItem[]): EntityState {
  const project: TravelProject = {
    id: 'proj-1' as any,
    workspaceId: 'ws-1' as any,
    title: 'Test',
    timezone: 'Asia/Tokyo',
    status: 'planning',
    visibility: 'private',
  };
  const planVersion: PlanVersion = {
    id: 'pv-1' as any,
    projectId: 'proj-1' as any,
    version: 1,
    status: 'draft',
    createdAt: '2026-09-26T00:00:00+09:00',
  };

  return {
    projects: [project],
    planVersions: [planVersion],
    planItems,
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
}

function makeItem(id: string, type: PlanItemType, start?: string): PlanItem {
  const detail = { type } as any;
  return {
    id: id as any,
    planVersionId: 'pv-1' as any,
    type,
    title: `Item ${id}`,
    schedule: {
      ...(start !== undefined ? { start } : {}),
    },
    places: [],
    detail,
    status: 'planned',
  } as PlanItem;
}

test('selectByType: groups items by type', () => {
  const items = [
    makeItem('item-1', 'attraction', '2026-09-26T10:00:00+09:00'),
    makeItem('item-2', 'meal', '2026-09-26T12:00:00+09:00'),
    makeItem('item-3', 'attraction', '2026-09-26T14:00:00+09:00'),
    makeItem('item-4', 'transport', '2026-09-26T09:00:00+09:00'),
  ];

  const state = makeState(items);
  const result = selectByType(state);

  const attraction = result.find((b) => b.type === 'attraction');
  const meal = result.find((b) => b.type === 'meal');
  const transport = result.find((b) => b.type === 'transport');

  assert.ok(attraction);
  assert.ok(meal);
  assert.ok(transport);
  assert.equal(attraction.items.length, 2);
  assert.equal(meal.items.length, 1);
  assert.equal(transport.items.length, 1);
  assert.deepEqual(attraction.items.map((i) => i.id), ['item-1', 'item-3']);
});

test('selectByType: only includes types that exist', () => {
  const items = [
    makeItem('item-1', 'attraction'),
    makeItem('item-2', 'meal'),
  ];

  const state = makeState(items);
  const result = selectByType(state);

  const types = result.map((b) => b.type);
  assert.equal(types.length, 2);
  assert.ok(types.includes('attraction'));
  assert.ok(types.includes('meal'));
  assert.ok(!types.includes('lodging'));
  assert.ok(!types.includes('flight'));
});

test('selectByType: items within a type are sorted by start time', () => {
  const items = [
    makeItem('item-b', 'attraction', '2026-09-26T14:00:00+09:00'),
    makeItem('item-a', 'attraction', '2026-09-26T09:00:00+09:00'),
    makeItem('item-c', 'attraction', '2026-09-26T12:00:00+09:00'),
  ];

  const state = makeState(items);
  const result = selectByType(state);

  const attraction = result.find((b) => b.type === 'attraction');
  assert.ok(attraction);
  const ids = attraction.items.map((i) => i.id);
  assert.deepEqual(ids, ['item-a', 'item-c', 'item-b']);
});

test('selectByType: does not mutate input state', () => {
  const items = [makeItem('item-1', 'attraction')];
  const state = makeState(items);
  const originalItems = [...state.planItems];

  selectByType(state);

  assert.equal(state.planItems.length, originalItems.length);
  assert.equal(state.planItems[0], originalItems[0]);
});

test('selectByType: all 10 types can be represented', () => {
  const allTypes: PlanItemType[] = [
    'lodging', 'meal', 'transport', 'attraction', 'shopping',
    'flight', 'event', 'freeTime', 'task', 'custom',
  ];

  const items = allTypes.map((type, i) => makeItem(`item-${i}`, type));
  const state = makeState(items);
  const result = selectByType(state);

  assert.equal(result.length, 10);
  for (const type of allTypes) {
    const bucket = result.find((b) => b.type === type);
    assert.ok(bucket);
    assert.equal(bucket.items.length, 1);
  }
});
