import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate } from '../../src/domain/migrations/migrate.ts';
import {
  validEvent,
  eventNoCoords,
  lodgingEvent,
  confirmedBookingEvent,
  ambiguousBookingEvent,
  validTodo,
} from '../../fixtures/migrations/fixtures.ts';

const testInput = {
  events: [validEvent, eventNoCoords, lodgingEvent, confirmedBookingEvent, ambiguousBookingEvent],
  todos: [validTodo],
};

test('idempotency: same input produces identical idMap', () => {
  const result1 = migrate(testInput);
  const result2 = migrate(testInput);
  
  assert.deepEqual(result1.idMap, result2.idMap);
});

test('idempotency: same input produces identical provenance', () => {
  const result1 = migrate(testInput);
  const result2 = migrate(testInput);
  
  assert.deepEqual(result1.report.provenance, result2.report.provenance);
});

test('idempotency: same input produces identical unresolved', () => {
  const result1 = migrate(testInput);
  const result2 = migrate(testInput);
  
  assert.deepEqual(result1.report.unresolved, result2.report.unresolved);
});

test('idempotency: same input produces identical planItems', () => {
  const result1 = migrate(testInput);
  const result2 = migrate(testInput);
  
  assert.deepEqual(result1.seed.planItems, result2.seed.planItems);
});

test('idempotency: same input produces identical places', () => {
  const result1 = migrate(testInput);
  const result2 = migrate(testInput);
  
  assert.deepEqual(result1.seed.places, result2.seed.places);
});

test('idempotency: same input produces identical bookings', () => {
  const result1 = migrate(testInput);
  const result2 = migrate(testInput);
  
  assert.deepEqual(result1.seed.bookings, result2.seed.bookings);
});

test('idempotency: same input produces identical tasks', () => {
  const result1 = migrate(testInput);
  const result2 = migrate(testInput);
  
  assert.deepEqual(result1.seed.tasks, result2.seed.tasks);
});

test('idempotency: input hash is deterministic', () => {
  const result1 = migrate(testInput);
  const result2 = migrate(testInput);
  
  assert.equal(result1.report.inputHash, result2.report.inputHash);
});
