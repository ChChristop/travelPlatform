import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectByCity } from '../../src/store/selectors/geo.ts';
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
  placeId?: string,
  start?: string,
): PlanItem {
  const places = placeId !== undefined ? [{ placeId: placeId as any, role: 'primary' as const }] : [];
  return {
    id: id as any,
    planVersionId: 'pv-1' as any,
    type: 'attraction',
    title: `Item ${id}`,
    schedule: {
      ...(start !== undefined ? { start } : {}),
    },
    places,
    detail: { type: 'attraction' } as any,
    status: 'planned',
  } as PlanItem;
}

test('selectByCity: groups items by city from place region', () => {
  const places: Place[] = [
    {
      id: 'place-osaka' as any,
      workspaceId: 'ws-1' as any,
      name: 'Osaka',
      region: { city: 'Osaka' },
    },
    {
      id: 'place-kyoto' as any,
      workspaceId: 'ws-1' as any,
      name: 'Kyoto',
      region: { city: 'Kyoto' },
    },
  ];

  const items = [
    makeItem('item-1', 'place-osaka', '2026-09-26T10:00:00+09:00'),
    makeItem('item-2', 'place-kyoto', '2026-09-26T11:00:00+09:00'),
    makeItem('item-3', 'place-osaka', '2026-09-26T12:00:00+09:00'),
  ];

  const state = makeState(items, places);
  const result = selectByCity(state);

  const osaka = result.find((b) => b.city === 'Osaka');
  const kyoto = result.find((b) => b.city === 'Kyoto');

  assert.ok(osaka);
  assert.ok(kyoto);
  assert.equal(osaka.items.length, 2);
  assert.equal(kyoto.items.length, 1);
  assert.deepEqual(osaka.items.map((i) => i.id), ['item-1', 'item-3']);
  assert.deepEqual(kyoto.items.map((i) => i.id), ['item-2']);
});

test('selectByCity: items without places go to unknown bucket', () => {
  const items = [
    makeItem('item-1'),
    makeItem('item-2', 'place-osaka'),
  ];

  const places: Place[] = [
    {
      id: 'place-osaka' as any,
      workspaceId: 'ws-1' as any,
      name: 'Osaka',
      region: { city: 'Osaka' },
    },
  ];

  const state = makeState(items, places);
  const result = selectByCity(state);

  const unknown = result.find((b) => b.city === 'unknown');
  assert.ok(unknown);
  assert.equal(unknown.items.length, 1);
  assert.equal(unknown.items[0].id, 'item-1');
});

test('selectByCity: items referencing non-existent place go to unknown', () => {
  const items = [
    makeItem('item-1', 'non-existent-place'),
  ];

  const state = makeState(items, []);
  const result = selectByCity(state);

  const unknown = result.find((b) => b.city === 'unknown');
  assert.ok(unknown);
  assert.equal(unknown.items.length, 1);
  assert.equal(unknown.items[0].id, 'item-1');
});

test('selectByCity: cities are sorted alphabetically, unknown last', () => {
  const places: Place[] = [
    { id: 'place-z' as any, workspaceId: 'ws-1' as any, name: 'Z', region: { city: 'Zurich' } },
    { id: 'place-a' as any, workspaceId: 'ws-1' as any, name: 'A', region: { city: 'Aichi' } },
    { id: 'place-m' as any, workspaceId: 'ws-1' as any, name: 'M', region: { city: 'Mie' } },
  ];

  const items = [
    makeItem('item-1', 'place-z'),
    makeItem('item-2', 'place-a'),
    makeItem('item-3', 'place-m'),
    makeItem('item-4'),
  ];

  const state = makeState(items, places);
  const result = selectByCity(state);

  const cities = result.map((b) => b.city);
  assert.deepEqual(cities, ['Aichi', 'Mie', 'Zurich', 'unknown']);
});

test('selectByCity: does not mutate input state', () => {
  const places: Place[] = [
    { id: 'place-osaka' as any, workspaceId: 'ws-1' as any, name: 'Osaka', region: { city: 'Osaka' } },
  ];
  const items = [makeItem('item-1', 'place-osaka')];
  const state = makeState(items, places);
  const originalItems = [...state.planItems];

  selectByCity(state);

  assert.equal(state.planItems.length, originalItems.length);
  assert.equal(state.planItems[0], originalItems[0]);
});
