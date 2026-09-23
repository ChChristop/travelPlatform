import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate } from '../../src/domain/migrations/migrate.ts';
import {
  validEvent,
  eventNoCoords,
  lodgingEvent,
  confirmedBookingEvent,
  ambiguousBookingEvent,
  invalidEvent,
  validTodo,
  invalidTodo,
} from '../../fixtures/migrations/fixtures.ts';

test('valid event creates correct PlanItem', () => {
  const result = migrate({ events: [validEvent], todos: [] });
  
  assert.equal(result.seed.planItems.length, 1);
  const item = result.seed.planItems[0];
  assert.equal(item.type, 'attraction');
  assert.equal(item.title, 'Test Event');
  assert.equal(item.schedule.start, '2026-09-26T10:00:00+09:00');
  assert.equal(item.schedule.end, '2026-09-26T11:00:00+09:00');
  assert.equal(item.places.length, 1);
  assert.equal(item.places[0].role, 'primary');
  
  const place = result.seed.places.find(p => p.id === item.places[0].placeId);
  assert.ok(place);
  assert.equal(place.coordinates?.lat, 34.6751);
  assert.equal(place.coordinates?.lng, 135.5004);
  
  const prov = result.report.provenance.find(p => p.legacyId === 'test-event-1');
  assert.ok(prov);
  assert.equal(prov.action, 'kept');
  assert.ok(prov.newIds.includes('plan-item:test-event-1'));
});

test('event without coordinates is handled safely', () => {
  const result = migrate({ events: [eventNoCoords], todos: [] });
  
  assert.equal(result.seed.planItems.length, 1);
  const item = result.seed.planItems[0];
  assert.equal(item.type, 'meal');
  assert.equal(item.places.length, 0);
  
  assert.ok(result.report.missingCoordinateIds.includes('test-no-coords'));
  
  const prov = result.report.provenance.find(p => p.legacyId === 'test-no-coords');
  assert.ok(prov);
  assert.equal(prov.action, 'kept');
  assert.ok(prov.note.includes('Coordinates missing'));
});

test('multi-day lodging is single PlanItem with period schedule', () => {
  const result = migrate({ events: [lodgingEvent], todos: [] });
  
  assert.equal(result.seed.planItems.length, 1);
  const item = result.seed.planItems[0];
  assert.equal(item.type, 'lodging');
  assert.equal(item.schedule.start, '2026-09-26T21:00:00+09:00');
  assert.equal(item.schedule.end, '2026-09-28T10:00:00+09:00');
  
  const prov = result.report.provenance.find(p => p.legacyId === 'test-lodging');
  assert.ok(prov);
  assert.ok(prov.note.includes('single lodging PlanItem'));
});

test('confirmed reservation creates Booking', () => {
  const result = migrate({ events: [confirmedBookingEvent], todos: [] });
  
  assert.equal(result.seed.bookings.length, 1);
  const booking = result.seed.bookings[0];
  assert.equal(booking.status, 'confirmed');
  assert.equal(booking.type, 'restaurant');
  assert.ok(booking.planItemIds.includes('plan-item:test-confirmed'));
  
  const prov = result.report.provenance.find(p => p.legacyId === 'test-confirmed');
  assert.ok(prov);
  assert.ok(prov.newIds.includes('booking:test-confirmed'));
  assert.ok(prov.note.includes('Booking created'));
});

test('ambiguous reservation does not create Booking but preserves text', () => {
  const result = migrate({ events: [ambiguousBookingEvent], todos: [] });
  
  assert.equal(result.seed.bookings.length, 0);
  
  const item = result.seed.planItems[0];
  assert.ok(item.bookingPolicy);
  assert.equal(item.bookingPolicy.note, '예약 추천');
  
  const prov = result.report.provenance.find(p => p.legacyId === 'test-ambiguous');
  assert.ok(prov);
  assert.equal(prov.action, 'kept');
  assert.ok(prov.note.includes('No Booking created'));
});

test('invalid event goes to unresolved', () => {
  const result = migrate({ events: [invalidEvent], todos: [] });
  
  assert.equal(result.seed.planItems.length, 0);
  assert.equal(result.report.unresolved.length, 1);
  
  const unresolved = result.report.unresolved[0];
  assert.equal(unresolved.legacyKind, 'event');
  assert.ok(unresolved.reason.includes('Invalid event structure'));
});

test('valid todo creates Task', () => {
  const result = migrate({ events: [], todos: [validTodo] });
  
  assert.equal(result.seed.tasks.length, 1);
  const task = result.seed.tasks[0];
  assert.equal(task.title, 'Test Todo');
  assert.equal(task.status, 'todo');
  
  const prov = result.report.provenance.find(p => p.legacyId === 'test-todo-1');
  assert.ok(prov);
  assert.equal(prov.legacyKind, 'todo');
  assert.equal(prov.action, 'kept');
});

test('invalid todo goes to unresolved', () => {
  const result = migrate({ events: [], todos: [invalidTodo] });
  
  assert.equal(result.seed.tasks.length, 0);
  assert.equal(result.report.unresolved.length, 1);
  
  const unresolved = result.report.unresolved[0];
  assert.equal(unresolved.legacyKind, 'todo');
  assert.ok(unresolved.reason.includes('Invalid todo structure'));
});
