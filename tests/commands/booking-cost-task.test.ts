import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBooking, updateBookingStatus } from '../../src/store/commands/booking.ts';
import { createCostRecord, aggregateCosts, addCostRecord } from '../../src/store/commands/cost.ts';
import { createTask, updateTaskStatus } from '../../src/store/commands/task.ts';
import type { EntityState } from '../../src/store/entities/state.ts';
import type { Booking } from '../../src/domain/booking.ts';
import type { CostRecord } from '../../src/domain/cost.ts';
import type { Task } from '../../src/domain/task.ts';
import type { PlanItem } from '../../src/domain/plan.ts';
import type { BookingId, ProjectId, PlanItemId, CostRecordId, TaskId, WorkspaceId, PlanVersionId } from '../../src/domain/ids.ts';

function makeState(): EntityState {
  const workspaceId = 'ws1' as WorkspaceId;
  const projectId = 'proj1' as ProjectId;
  const planVersionId = 'pv1' as PlanVersionId;

  return {
    projects: [{
      id: projectId,
      workspaceId,
      title: 'Test Project',
      timezone: 'Asia/Tokyo',
      status: 'planning',
      visibility: 'private',
    }],
    planVersions: [{
      id: planVersionId,
      projectId,
      version: 1,
      status: 'draft',
      createdAt: '2026-01-01T00:00:00Z',
    }],
    planItems: [],
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

test('createBooking validates and creates booking without undefined fields', () => {
  const result = createBooking({
    id: 'b1' as BookingId,
    projectId: 'proj1' as ProjectId,
    planItemIds: ['item1' as PlanItemId],
    type: 'hotel',
    status: 'confirmed',
    provider: 'Test Hotel',
  });

  assert.ok(result.ok);
  if (!result.ok) return;

  const booking = result.value;
  assert.equal(booking.id, 'b1');
  assert.equal(booking.provider, 'Test Hotel');
  assert.equal(booking.datetime, undefined);
  assert.equal(booking.partySize, undefined);
  assert.equal(booking.confirmationCode, undefined);
  assert.equal(booking.bookingUrl, undefined);
  assert.equal(booking.bookedAt, undefined);
  assert.equal(booking.cancellationDeadline, undefined);
  assert.equal(booking.costRecordIds, undefined);
  assert.equal(booking.attachmentIds, undefined);
});

test('createBooking rejects invalid type', () => {
  const result = createBooking({
    id: 'b1' as BookingId,
    projectId: 'proj1' as ProjectId,
    planItemIds: [],
    type: 'invalid' as Booking['type'],
    status: 'draft',
  });

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.match(result.error, /Invalid Booking type/);
  }
});

test('updateBookingStatus returns full EntityState on success', () => {
  const state = makeState();
  const booking: Booking = {
    id: 'b1' as BookingId,
    projectId: 'proj1' as ProjectId,
    planItemIds: [],
    type: 'hotel',
    status: 'draft',
  };
  const stateWithBooking: EntityState = { ...state, bookings: [booking] };

  const result = updateBookingStatus(stateWithBooking, 'b1' as BookingId, 'confirmed');
  assert.ok(result.ok);
  if (!result.ok) return;

  const newState = result.value;
  assert.equal(newState.bookings.length, 1);
  assert.equal(newState.bookings[0].status, 'confirmed');
  assert.equal(newState.projects.length, 1);
  assert.equal(newState.planVersions.length, 1);
});

test('updateBookingStatus rejects non-existent booking', () => {
  const state = makeState();
  const result = updateBookingStatus(state, 'nonexistent' as BookingId, 'confirmed');
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.match(result.error, /not found/);
  }
});

test('updateBookingStatus rejects invalid status', () => {
  const state = makeState();
  const booking: Booking = {
    id: 'b1' as BookingId,
    projectId: 'proj1' as ProjectId,
    planItemIds: [],
    type: 'hotel',
    status: 'draft',
  };
  const stateWithBooking: EntityState = { ...state, bookings: [booking] };

  const result = updateBookingStatus(stateWithBooking, 'b1' as BookingId, 'invalid' as Booking['status']);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.match(result.error, /Invalid Booking status/);
  }
});

test('createCostRecord validates and creates record without undefined fields', () => {
  const result = createCostRecord({
    id: 'c1' as CostRecordId,
    projectId: 'proj1' as ProjectId,
    subject: { type: 'planItem', id: 'item1' as PlanItemId },
    type: 'actual',
    category: 'lodging',
    total: { amount: 10000, currency: 'JPY' },
  });

  assert.ok(result.ok);
  if (!result.ok) return;

  const record = result.value;
  assert.equal(record.id, 'c1');
  assert.equal(record.total.amount, 10000);
  assert.equal(record.total.currency, 'JPY');
  assert.equal(record.breakdown, undefined);
  assert.equal(record.servicePeriod, undefined);
  assert.equal(record.payment, undefined);
});

test('createCostRecord rejects invalid total', () => {
  const result = createCostRecord({
    id: 'c1' as CostRecordId,
    projectId: 'proj1' as ProjectId,
    subject: { type: 'planItem', id: 'item1' as PlanItemId },
    type: 'actual',
    category: 'lodging',
    total: { amount: NaN, currency: 'JPY' },
  });

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.match(result.error, /valid Money/);
  }
});

test('aggregateCosts calculates netActual as actual minus refund per currency', () => {
  const records: CostRecord[] = [
    {
      id: 'c1' as CostRecordId,
      projectId: 'proj1' as ProjectId,
      subject: { type: 'planItem', id: 'item1' as PlanItemId },
      type: 'actual',
      category: 'lodging',
      total: { amount: 10000, currency: 'JPY' },
    },
    {
      id: 'c2' as CostRecordId,
      projectId: 'proj1' as ProjectId,
      subject: { type: 'planItem', id: 'item1' as PlanItemId },
      type: 'refund',
      category: 'lodging',
      total: { amount: 2000, currency: 'JPY' },
    },
    {
      id: 'c3' as CostRecordId,
      projectId: 'proj1' as ProjectId,
      subject: { type: 'planItem', id: 'item2' as PlanItemId },
      type: 'estimate',
      category: 'food',
      total: { amount: 5000, currency: 'JPY' },
    },
    {
      id: 'c4' as CostRecordId,
      projectId: 'proj1' as ProjectId,
      subject: { type: 'planItem', id: 'item3' as PlanItemId },
      type: 'actual',
      category: 'transport',
      total: { amount: 3000, currency: 'USD' },
    },
  ];

  const agg = aggregateCosts(records);

  assert.equal(agg.byCurrency['JPY'].actual, 10000);
  assert.equal(agg.byCurrency['JPY'].refund, 2000);
  assert.equal(agg.byCurrency['JPY'].estimate, 5000);
  assert.equal(agg.byCurrency['JPY'].committed, 0);
  assert.equal(agg.netActualByCurrency['JPY'], 8000);

  assert.equal(agg.byCurrency['USD'].actual, 3000);
  assert.equal(agg.netActualByCurrency['USD'], 3000);
});

test('addCostRecord returns full EntityState and rejects duplicates', () => {
  const state = makeState();
  const planItem: PlanItem = {
    id: 'item1' as PlanItemId,
    planVersionId: 'pv1' as PlanVersionId,
    type: 'attraction',
    title: 'Test Item',
    schedule: {},
    places: [],
    status: 'planned',
    detail: { type: 'attraction' },
  };
  const stateWithItem: EntityState = { ...state, planItems: [planItem] };
  const record: CostRecord = {
    id: 'c1' as CostRecordId,
    projectId: 'proj1' as ProjectId,
    subject: { type: 'planItem', id: 'item1' as PlanItemId },
    type: 'actual',
    category: 'lodging',
    total: { amount: 10000, currency: 'JPY' },
  };

  const result = addCostRecord(stateWithItem, record);
  assert.ok(result.ok);
  if (!result.ok) return;

  const newState = result.value;
  assert.equal(newState.costRecords.length, 1);
  assert.equal(newState.costRecords[0].id, 'c1');

  const duplicate = addCostRecord(newState, record);
  assert.ok(!duplicate.ok);
  if (!duplicate.ok) {
    assert.match(duplicate.error, /already exists/);
  }
});

test('addCostRecord rejects missing subject', () => {
  const state = makeState();
  const record: CostRecord = {
    id: 'c1' as CostRecordId,
    projectId: 'proj1' as ProjectId,
    subject: { type: 'planItem', id: 'nonexistent' as PlanItemId },
    type: 'actual',
    category: 'lodging',
    total: { amount: 10000, currency: 'JPY' },
  };

  const result = addCostRecord(state, record);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.match(result.error, /not found/);
  }
});

test('addCostRecord rejects cross-project planItem', () => {
  const workspaceId = 'ws1' as WorkspaceId;
  const projectId = 'proj1' as ProjectId;
  const otherProjectId = 'proj2' as ProjectId;
  const planVersionId = 'pv1' as PlanVersionId;
  const otherPlanVersionId = 'pv2' as PlanVersionId;

  const state: EntityState = {
    projects: [
      {
        id: projectId,
        workspaceId,
        title: 'Test Project',
        timezone: 'Asia/Tokyo',
        status: 'planning',
        visibility: 'private',
      },
      {
        id: otherProjectId,
        workspaceId,
        title: 'Other Project',
        timezone: 'Asia/Tokyo',
        status: 'planning',
        visibility: 'private',
      },
    ],
    planVersions: [
      {
        id: planVersionId,
        projectId,
        version: 1,
        status: 'draft',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: otherPlanVersionId,
        projectId: otherProjectId,
        version: 1,
        status: 'draft',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
    planItems: [
      {
        id: 'item1' as PlanItemId,
        planVersionId: otherPlanVersionId,
        type: 'attraction',
        title: 'Other Item',
        schedule: {},
        places: [],
        status: 'planned',
        detail: { type: 'attraction' },
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

  const record: CostRecord = {
    id: 'c1' as CostRecordId,
    projectId: projectId,
    subject: { type: 'planItem', id: 'item1' as PlanItemId },
    type: 'actual',
    category: 'lodging',
    total: { amount: 10000, currency: 'JPY' },
  };

  const result = addCostRecord(state, record);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.match(result.error, /does not belong to project/);
  }
});

test('addCostRecord rejects invalid amount', () => {
  const state = makeState();
  const planItem: PlanItem = {
    id: 'item1' as PlanItemId,
    planVersionId: 'pv1' as PlanVersionId,
    type: 'attraction',
    title: 'Test Item',
    schedule: {},
    places: [],
    status: 'planned',
    detail: { type: 'attraction' },
  };
  const stateWithItem: EntityState = { ...state, planItems: [planItem] };

  const recordNegative: CostRecord = {
    id: 'c1' as CostRecordId,
    projectId: 'proj1' as ProjectId,
    subject: { type: 'planItem', id: 'item1' as PlanItemId },
    type: 'actual',
    category: 'lodging',
    total: { amount: -100, currency: 'JPY' },
  };

  const resultNegative = addCostRecord(stateWithItem, recordNegative);
  assert.ok(!resultNegative.ok);
  if (!resultNegative.ok) {
    assert.match(resultNegative.error, /finite number >= 0/);
  }

  const recordNaN: CostRecord = {
    id: 'c2' as CostRecordId,
    projectId: 'proj1' as ProjectId,
    subject: { type: 'planItem', id: 'item1' as PlanItemId },
    type: 'actual',
    category: 'lodging',
    total: { amount: NaN, currency: 'JPY' },
  };

  const resultNaN = addCostRecord(stateWithItem, recordNaN);
  assert.ok(!resultNaN.ok);
  if (!resultNaN.ok) {
    assert.match(resultNaN.error, /finite number >= 0/);
  }
});

test('addCostRecord succeeds with valid record', () => {
  const state = makeState();
  const planItem: PlanItem = {
    id: 'item1' as PlanItemId,
    planVersionId: 'pv1' as PlanVersionId,
    type: 'attraction',
    title: 'Test Item',
    schedule: {},
    places: [],
    status: 'planned',
    detail: { type: 'attraction' },
  };
  const stateWithItem: EntityState = { ...state, planItems: [planItem] };

  const record: CostRecord = {
    id: 'c1' as CostRecordId,
    projectId: 'proj1' as ProjectId,
    subject: { type: 'planItem', id: 'item1' as PlanItemId },
    type: 'actual',
    category: 'lodging',
    total: { amount: 10000, currency: 'JPY' },
  };

  const result = addCostRecord(stateWithItem, record);
  assert.ok(result.ok);
  if (!result.ok) return;

  const newState = result.value;
  assert.equal(newState.costRecords.length, 1);
  assert.equal(newState.costRecords[0].id, 'c1');
  assert.equal(newState.costRecords[0].total.amount, 10000);
});

test('createTask validates and creates task without undefined fields', () => {
  const result = createTask({
    id: 't1' as TaskId,
    projectId: 'proj1' as ProjectId,
    title: 'Test Task',
    status: 'todo',
  });

  assert.ok(result.ok);
  if (!result.ok) return;

  const task = result.value;
  assert.equal(task.id, 't1');
  assert.equal(task.title, 'Test Task');
  assert.equal(task.status, 'todo');
  assert.equal(task.linkedPlanItemId, undefined);
  assert.equal(task.trigger, undefined);
});

test('updateTaskStatus returns full EntityState on success', () => {
  const state = makeState();
  const task: Task = {
    id: 't1' as TaskId,
    projectId: 'proj1' as ProjectId,
    title: 'Test Task',
    status: 'todo',
  };
  const stateWithTask: EntityState = { ...state, tasks: [task] };

  const result = updateTaskStatus(stateWithTask, 't1' as TaskId, 'done');
  assert.ok(result.ok);
  if (!result.ok) return;

  const newState = result.value;
  assert.equal(newState.tasks.length, 1);
  assert.equal(newState.tasks[0].status, 'done');
  assert.equal(newState.projects.length, 1);
});

test('updateTaskStatus rejects non-existent task', () => {
  const state = makeState();
  const result = updateTaskStatus(state, 'nonexistent' as TaskId, 'done');
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.match(result.error, /not found/);
  }
});

test('updateTaskStatus rejects invalid status', () => {
  const state = makeState();
  const task: Task = {
    id: 't1' as TaskId,
    projectId: 'proj1' as ProjectId,
    title: 'Test Task',
    status: 'todo',
  };
  const stateWithTask: EntityState = { ...state, tasks: [task] };

  const result = updateTaskStatus(stateWithTask, 't1' as TaskId, 'invalid' as Task['status']);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.match(result.error, /Invalid Task status/);
  }
});
