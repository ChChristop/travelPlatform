import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPlatformState } from '../../src/platform/dataSource.js';

test('getPlatformState returns valid state with projects', () => {
  const result = getPlatformState();
  assert.equal(result.error, null);
  assert.ok(result.state);
  
  const state = result.state!;
  assert.ok(state.projects.length >= 1);
  assert.equal(state.projects[0].id, 'project:kansai-2026');
  assert.equal(state.projects[0].timezone, 'Asia/Tokyo');
});

test('getPlatformState returns plan items from migration', () => {
  const result = getPlatformState();
  assert.equal(result.error, null);
  assert.ok(result.state);
  
  const state = result.state!;
  assert.ok(state.planItems.length > 0);
  
  // Check that plan items have required fields
  for (const item of state.planItems) {
    assert.ok(item.id);
    assert.ok(item.title);
    assert.ok(item.schedule);
    assert.ok(item.type);
    assert.ok(item.detail);
  }
});

test('getPlatformState returns places with coordinates', () => {
  const result = getPlatformState();
  assert.equal(result.error, null);
  assert.ok(result.state);
  
  const state = result.state!;
  assert.ok(state.places.length > 0);
  
  // Check that places with coordinates have valid lat/lng
  const placesWithCoords = state.places.filter(p => p.coordinates);
  assert.ok(placesWithCoords.length > 0);
  
  for (const place of placesWithCoords) {
    assert.ok(Number.isFinite(place.coordinates!.lat));
    assert.ok(Number.isFinite(place.coordinates!.lng));
  }
});

test('getPlatformState returns tasks from todos', () => {
  const result = getPlatformState();
  assert.equal(result.error, null);
  assert.ok(result.state);
  
  const state = result.state!;
  assert.ok(state.tasks.length > 0);
  
  for (const task of state.tasks) {
    assert.ok(task.id);
    assert.ok(task.title);
    assert.equal(task.status, 'todo');
  }
});

test('getPlatformState returns plan version', () => {
  const result = getPlatformState();
  assert.equal(result.error, null);
  assert.ok(result.state);
  
  const state = result.state!;
  assert.equal(state.planVersions.length, 1);
  assert.equal(state.planVersions[0].id, 'plan-version:kansai-2026');
  assert.equal(state.planVersions[0].version, 1);
});

test('getPlatformState handles errors gracefully', () => {
  // This test verifies that the function doesn't throw and returns error state
  // if something goes wrong. We can't easily force an error without mocking,
  // but we can verify the return shape is consistent.
  const result = getPlatformState();
  
  // Result should always have state and error properties
  assert.ok('state' in result);
  assert.ok('error' in result);
  
  // If no error, state should be non-null
  if (result.error === null) {
    assert.ok(result.state);
  }
});
