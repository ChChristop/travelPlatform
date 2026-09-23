import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectByDay } from '../../src/store/selectors/timeline.ts';
import type { EntityState } from '../../src/store/entities/state.ts';
import type { PlanItem } from '../../src/domain/plan.ts';
import type { Place } from '../../src/domain/place.ts';
import type { TravelProject } from '../../src/domain/project.ts';
import type { PlanVersion } from '../../src/domain/plan.ts';

function makeState(planItems: PlanItem[], places: Place[] = []): EntityState {
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
    places,
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

function makeItem(
  id: string,
  start?: string,
  end?: string,
  type: PlanItem['type'] = 'attraction',
): PlanItem {
  const detail = { type } as any;
  return {
    id: id as any,
    planVersionId: 'pv-1' as any,
    type,
    title: `Item ${id}`,
    schedule: {
      ...(start !== undefined ? { start } : {}),
      ...(end !== undefined ? { end } : {}),
    },
    places: [],
    detail,
    status: 'planned',
  } as PlanItem;
}

test('selectByDay: single day item appears in one bucket', () => {
  const item = makeItem('item-1', '2026-09-26T10:00:00+09:00', '2026-09-26T12:00:00+09:00');
  const state = makeState([item]);
  const result = selectByDay(state, 'Asia/Tokyo');

  assert.equal(result.length, 1);
  assert.equal(result[0].day, '2026-09-26');
  assert.equal(result[0].items.length, 1);
  assert.equal(result[0].items[0].id, 'item-1');
});

test('selectByDay: multi-day lodging appears in all day buckets with same reference', () => {
  const item = makeItem(
    'lodging-1',
    '2026-09-26T15:00:00+09:00',
    '2026-09-28T11:00:00+09:00',
    'lodging',
  );
  const state = makeState([item]);
  const result = selectByDay(state, 'Asia/Tokyo');

  const days = result.map((b) => b.day);
  assert.deepEqual(days, ['2026-09-26', '2026-09-27', '2026-09-28']);

  for (const bucket of result) {
    assert.equal(bucket.items.length, 1);
    assert.equal(bucket.items[0].id, 'lodging-1');
    assert.equal(bucket.items[0], item);
  }
});

test('selectByDay: unscheduled items go to unscheduled bucket', () => {
  const item1 = makeItem('item-1');
  const item2 = makeItem('item-2', '2026-09-26T10:00:00+09:00');
  const state = makeState([item1, item2]);
  const result = selectByDay(state, 'Asia/Tokyo');

  const unscheduled = result.find((b) => b.day === 'unscheduled');
  assert.ok(unscheduled);
  assert.equal(unscheduled.items.length, 1);
  assert.equal(unscheduled.items[0].id, 'item-1');

  const scheduled = result.find((b) => b.day === '2026-09-26');
  assert.ok(scheduled);
  assert.equal(scheduled.items.length, 1);
  assert.equal(scheduled.items[0].id, 'item-2');
});

test('selectByDay: days are sorted ascending, unscheduled last', () => {
  const items = [
    makeItem('item-3', '2026-09-28T10:00:00+09:00'),
    makeItem('item-1', '2026-09-26T10:00:00+09:00'),
    makeItem('item-2', '2026-09-27T10:00:00+09:00'),
    makeItem('item-unsched'),
  ];
  const state = makeState(items);
  const result = selectByDay(state, 'Asia/Tokyo');

  const days = result.map((b) => b.day);
  assert.deepEqual(days, ['2026-09-26', '2026-09-27', '2026-09-28', 'unscheduled']);
});

test('selectByDay: items within a day are sorted by start time', () => {
  const items = [
    makeItem('item-b', '2026-09-26T14:00:00+09:00'),
    makeItem('item-a', '2026-09-26T09:00:00+09:00'),
    makeItem('item-c', '2026-09-26T12:00:00+09:00'),
  ];
  const state = makeState(items);
  const result = selectByDay(state, 'Asia/Tokyo');

  const dayBucket = result.find((b) => b.day === '2026-09-26');
  assert.ok(dayBucket);
  const ids = dayBucket.items.map((i) => i.id);
  assert.deepEqual(ids, ['item-a', 'item-c', 'item-b']);
});

test('selectByDay: does not mutate input state', () => {
  const item = makeItem('item-1', '2026-09-26T10:00:00+09:00');
  const state = makeState([item]);
  const originalItems = [...state.planItems];

  selectByDay(state, 'Asia/Tokyo');

  assert.equal(state.planItems.length, originalItems.length);
  assert.equal(state.planItems[0], originalItems[0]);
});

test('selectByDay: timezone conversion affects day boundary', () => {
  const item = makeItem('item-1', '2026-09-26T23:30:00+09:00');
  const state = makeState([item]);

  const tokyoResult = selectByDay(state, 'Asia/Tokyo');
  assert.equal(tokyoResult[0].day, '2026-09-26');

  const item2 = makeItem('item-2', '2026-09-27T00:30:00+09:00');
  const state2 = makeState([item2]);
  const tokyoResult2 = selectByDay(state2, 'Asia/Tokyo');
  assert.equal(tokyoResult2[0].day, '2026-09-27');

  const utcResult = selectByDay(state2, 'UTC');
  assert.equal(utcResult[0].day, '2026-09-26');
});
