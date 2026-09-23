import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePrimaryPlace, buildMarkers } from '../../src/platform/features/map/mapHelpers.js';

// Pure logic tests for map helper functions, imported from the real module
// that MapView.jsx also imports from (src/platform/features/map/mapHelpers.js) —
// not a duplicated copy, so these tests actually verify the code the component runs.

// Minimal mock state for testing
function createMockState(places: any[], planItems: any[]) {
  return {
    projects: [],
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

test('resolvePrimaryPlace returns place for item with primary reference', () => {
  const places = [
    { id: 'p1', name: 'Test Place', coordinates: { lat: 35.0, lng: 135.0 } },
  ];
  const planItems = [
    {
      id: 'item1',
      title: 'Test Item',
      type: 'attraction',
      schedule: { start: '2026-09-27T10:00:00+09:00', end: '2026-09-27T12:00:00+09:00' },
      places: [{ placeId: 'p1', role: 'primary' }],
      detail: { type: 'attraction' },
      status: 'planned',
    },
  ];
  const state = createMockState(places, planItems);
  const place = resolvePrimaryPlace(state, planItems[0]);
  assert.ok(place);
  assert.equal(place!.id, 'p1');
  assert.equal(place!.name, 'Test Place');
});

test('resolvePrimaryPlace returns null for item without places', () => {
  const places = [];
  const planItems = [
    {
      id: 'item1',
      title: 'Test Item',
      type: 'attraction',
      schedule: { start: '2026-09-27T10:00:00+09:00', end: '2026-09-27T12:00:00+09:00' },
      places: [],
      detail: { type: 'attraction' },
      status: 'planned',
    },
  ];
  const state = createMockState(places, planItems);
  const place = resolvePrimaryPlace(state, planItems[0]);
  assert.equal(place, null);
});

test('resolvePrimaryPlace falls back to first reference when no primary', () => {
  const places = [
    { id: 'p1', name: 'Test Place', coordinates: { lat: 35.0, lng: 135.0 } },
  ];
  const planItems = [
    {
      id: 'item1',
      title: 'Test Item',
      type: 'attraction',
      schedule: { start: '2026-09-27T10:00:00+09:00', end: '2026-09-27T12:00:00+09:00' },
      places: [{ placeId: 'p1', role: 'stop' }],
      detail: { type: 'attraction' },
      status: 'planned',
    },
  ];
  const state = createMockState(places, planItems);
  const place = resolvePrimaryPlace(state, planItems[0]);
  assert.ok(place);
  assert.equal(place!.id, 'p1');
});

test('buildMarkers returns markers only for items with valid coordinates', () => {
  const places = [
    { id: 'p1', name: 'Place A', coordinates: { lat: 35.0, lng: 135.0 } },
    { id: 'p2', name: 'Place B', coordinates: undefined },
    { id: 'p3', name: 'Place C', coordinates: { lat: 34.5, lng: 135.5 } },
  ];
  const planItems = [
    {
      id: 'item1',
      title: 'Item 1',
      type: 'attraction',
      schedule: { start: '2026-09-27T10:00:00+09:00', end: '2026-09-27T12:00:00+09:00' },
      places: [{ placeId: 'p1', role: 'primary' }],
      detail: { type: 'attraction' },
      status: 'planned',
    },
    {
      id: 'item2',
      title: 'Item 2',
      type: 'meal',
      schedule: { start: '2026-09-27T13:00:00+09:00', end: '2026-09-27T14:00:00+09:00' },
      places: [{ placeId: 'p2', role: 'primary' }],
      detail: { type: 'meal' },
      status: 'planned',
    },
    {
      id: 'item3',
      title: 'Item 3',
      type: 'sight',
      schedule: { start: '2026-09-27T15:00:00+09:00', end: '2026-09-27T16:00:00+09:00' },
      places: [{ placeId: 'p3', role: 'primary' }],
      detail: { type: 'attraction' },
      status: 'planned',
    },
  ];
  const state = createMockState(places, planItems);
  const markers = buildMarkers(state, planItems);

  assert.equal(markers.length, 2);
  assert.equal(markers[0].id, 'item1');
  assert.equal(markers[0].lat, 35.0);
  assert.equal(markers[0].lng, 135.0);
  assert.equal(markers[0].placeName, 'Place A');
  assert.equal(markers[1].id, 'item3');
  assert.equal(markers[1].lat, 34.5);
  assert.equal(markers[1].lng, 135.5);
  assert.equal(markers[1].placeName, 'Place C');
});

test('buildMarkers returns empty array when no items have coordinates', () => {
  const places = [
    { id: 'p1', name: 'Place A', coordinates: undefined },
  ];
  const planItems = [
    {
      id: 'item1',
      title: 'Item 1',
      type: 'attraction',
      schedule: { start: '2026-09-27T10:00:00+09:00', end: '2026-09-27T12:00:00+09:00' },
      places: [{ placeId: 'p1', role: 'primary' }],
      detail: { type: 'attraction' },
      status: 'planned',
    },
  ];
  const state = createMockState(places, planItems);
  const markers = buildMarkers(state, planItems);
  assert.equal(markers.length, 0);
});

test('buildMarkers handles items with no places', () => {
  const places = [];
  const planItems = [
    {
      id: 'item1',
      title: 'Item 1',
      type: 'attraction',
      schedule: { start: '2026-09-27T10:00:00+09:00', end: '2026-09-27T12:00:00+09:00' },
      places: [],
      detail: { type: 'attraction' },
      status: 'planned',
    },
  ];
  const state = createMockState(places, planItems);
  const markers = buildMarkers(state, planItems);
  assert.equal(markers.length, 0);
});
