import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectByDay } from '../../src/store/selectors/timeline.ts';
import type { EntityState } from '../../src/store/entities/state.ts';
import type { PlanItem } from '../../src/domain/plan.ts';
import type { Place } from '../../src/domain/place.ts';
import type { TravelProject } from '../../src/domain/project.ts';

function makeState(planItems: PlanItem[], places: Place[] = []): EntityState {
  const project: TravelProject = {
    id: 'proj-1',
    workspaceId: 'ws-1',
    title: 'Test Trip',
    timezone: 'Asia/Tokyo',
    status: 'planning',
    visibility: 'private',
  };

  return {
    projects: [project],
    planVersions: [],
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

function makePlanItem(
  id: string,
  start: string,
  end: string,
  title: string,
  type: PlanItem['type'] = 'attraction',
  places: { placeId: string; role: 'primary' | 'origin' | 'destination' | 'stop' }[] = []
): PlanItem {
  const base = {
    id,
    planVersionId: 'pv-1',
    title,
    schedule: { start, end },
    places,
    status: 'planned' as const,
  };

  switch (type) {
    case 'lodging':
      return { ...base, type, detail: { type: 'lodging' } };
    case 'meal':
      return { ...base, type, detail: { type: 'meal' } };
    case 'transport':
      return { ...base, type, detail: { type: 'transport' } };
    case 'attraction':
      return { ...base, type, detail: { type: 'attraction' } };
    case 'shopping':
      return { ...base, type, detail: { type: 'shopping' } };
    case 'flight':
      return { ...base, type, detail: { type: 'flight' } };
    case 'event':
      return { ...base, type, detail: { type: 'event' } };
    case 'freeTime':
      return { ...base, type, detail: { type: 'freeTime' } };
    case 'task':
      return { ...base, type, detail: { type: 'task' } };
    case 'custom':
      return { ...base, type, detail: { type: 'custom' } };
    default:
      return { ...base, type: 'custom', detail: { type: 'custom' } };
  }
}

function makePlace(id: string, name: string, coordinates?: { lat: number; lng: number }): Place {
  return {
    id,
    workspaceId: 'ws-1',
    name,
    coordinates,
  };
}

test('selectByDay groups items by day in timezone', () => {
  const items: PlanItem[] = [
    makePlanItem('item-1', '2026-09-26T10:00:00+09:00', '2026-09-26T12:00:00+09:00', 'Day 1 Item'),
    makePlanItem('item-2', '2026-09-27T09:00:00+09:00', '2026-09-27T11:00:00+09:00', 'Day 2 Item'),
    makePlanItem('item-3', '2026-09-26T15:00:00+09:00', '2026-09-26T17:00:00+09:00', 'Day 1 Item 2'),
  ];

  const state = makeState(items);
  const buckets = selectByDay(state, 'Asia/Tokyo');

  assert.equal(buckets.length, 2);
  assert.equal(buckets[0].day, '2026-09-26');
  assert.equal(buckets[0].items.length, 2);
  assert.equal(buckets[1].day, '2026-09-27');
  assert.equal(buckets[1].items.length, 1);
});

test('selectByDay sorts items within a day by start time', () => {
  const items: PlanItem[] = [
    makePlanItem('item-late', '2026-09-26T15:00:00+09:00', '2026-09-26T17:00:00+09:00', 'Late Item'),
    makePlanItem('item-early', '2026-09-26T09:00:00+09:00', '2026-09-26T10:00:00+09:00', 'Early Item'),
  ];

  const state = makeState(items);
  const buckets = selectByDay(state, 'Asia/Tokyo');

  assert.equal(buckets.length, 1);
  assert.equal(buckets[0].items[0].id, 'item-early');
  assert.equal(buckets[0].items[1].id, 'item-late');
});

test('selectByDay handles items without start time as unscheduled', () => {
  const items: PlanItem[] = [
    makePlanItem('item-no-start', '', '', 'No Start Item'),
    makePlanItem('item-normal', '2026-09-26T10:00:00+09:00', '2026-09-26T12:00:00+09:00', 'Normal Item'),
  ];

  const state = makeState(items);
  const buckets = selectByDay(state, 'Asia/Tokyo');

  const unscheduled = buckets.find((b) => b.day === 'unscheduled');
  assert.ok(unscheduled, 'should have unscheduled bucket');
  assert.equal(unscheduled!.items.length, 1);
  assert.equal(unscheduled!.items[0].id, 'item-no-start');
});

test('selectByDay handles multi-day items spanning multiple days', () => {
  const items: PlanItem[] = [
    makePlanItem('item-multi', '2026-09-26T20:00:00+09:00', '2026-09-28T10:00:00+09:00', 'Multi-day Item'),
  ];

  const state = makeState(items);
  const buckets = selectByDay(state, 'Asia/Tokyo');

  assert.equal(buckets.length, 3);
  assert.equal(buckets[0].day, '2026-09-26');
  assert.equal(buckets[1].day, '2026-09-27');
  assert.equal(buckets[2].day, '2026-09-28');
  for (const bucket of buckets) {
    assert.equal(bucket.items.length, 1);
    assert.equal(bucket.items[0].id, 'item-multi');
  }
});

test('selectByDay returns empty array for empty state', () => {
  const state = makeState([]);
  const buckets = selectByDay(state, 'Asia/Tokyo');
  assert.equal(buckets.length, 0);
});

test('selectByDay respects timezone for date boundaries', () => {
  const items: PlanItem[] = [
    makePlanItem('item-tokyo-evening', '2026-09-26T23:30:00+09:00', '2026-09-26T23:59:00+09:00', 'Tokyo Evening'),
    makePlanItem('item-tokyo-morning', '2026-09-27T00:30:00+09:00', '2026-09-27T01:00:00+09:00', 'Tokyo Morning'),
  ];

  const state = makeState(items);
  const buckets = selectByDay(state, 'Asia/Tokyo');

  assert.equal(buckets.length, 2);
  assert.equal(buckets[0].day, '2026-09-26');
  assert.equal(buckets[1].day, '2026-09-27');
});

test('selectByDay places with coordinates are accessible', () => {
  const places: Place[] = [
    makePlace('place-1', 'Osaka Castle', { lat: 34.6873, lng: 135.5262 }),
  ];

  const items: PlanItem[] = [
    makePlanItem('item-1', '2026-09-27T15:45:00+09:00', '2026-09-27T17:20:00+09:00', 'Osaka Castle', 'attraction', [
      { placeId: 'place-1', role: 'primary' },
    ]),
  ];

  const state = makeState(items, places);
  const buckets = selectByDay(state, 'Asia/Tokyo');

  assert.equal(buckets.length, 1);
  const item = buckets[0].items[0];
  assert.equal(item.places.length, 1);
  assert.equal(item.places[0].placeId, 'place-1');

  const place = state.places.find((p) => p.id === 'place-1');
  assert.ok(place);
  assert.ok(place!.coordinates);
  assert.equal(place!.coordinates!.lat, 34.6873);
});

test('selectByDay items without places are valid', () => {
  const items: PlanItem[] = [
    makePlanItem('item-no-place', '2026-09-26T10:00:00+09:00', '2026-09-26T12:00:00+09:00', 'No Place Item'),
  ];

  const state = makeState(items);
  const buckets = selectByDay(state, 'Asia/Tokyo');

  assert.equal(buckets.length, 1);
  assert.equal(buckets[0].items[0].places.length, 0);
});
