import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOptionGroup, deriveActiveState, previewOptionChange, commitOptionChange } from '../../src/store/commands/option.ts';
import type { EntityState } from '../../src/store/entities/state.ts';
import type { PlanItem } from '../../src/domain/plan.ts';
import type { OptionGroup, PlanOption, PlanFragment } from '../../src/domain/alternatives.ts';
import type { OptionGroupId, PlanOptionId, PlanFragmentId, PlanItemId, PlanVersionId, ProjectId, WorkspaceId, PlaceId, BookingId, CostRecordId } from '../../src/domain/ids.ts';
import type { Booking } from '../../src/domain/booking.ts';
import type { CostRecord } from '../../src/domain/cost.ts';

function makePlanItem(id: PlanItemId, planVersionId: PlanVersionId, title: string): PlanItem {
  return {
    id,
    planVersionId,
    type: 'attraction',
    title,
    schedule: {},
    places: [],
    status: 'planned',
    detail: { type: 'attraction' },
  };
}

function makeState(): EntityState {
  const workspaceId = 'ws1' as WorkspaceId;
  const projectId = 'proj1' as ProjectId;
  const planVersionId = 'pv1' as PlanVersionId;
  const itemA = 'itemA' as PlanItemId;
  const itemB = 'itemB' as PlanItemId;
  const itemC = 'itemC' as PlanItemId;
  const itemD = 'itemD' as PlanItemId;

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
    planItems: [
      makePlanItem(itemA, planVersionId, 'Item A'),
      makePlanItem(itemB, planVersionId, 'Item B'),
      makePlanItem(itemC, planVersionId, 'Item C'),
      makePlanItem(itemD, planVersionId, 'Item D'),
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
}

test('createOptionGroup creates OptionGroup, PlanOptions, and PlanFragments', () => {
  const state = makeState();
  const groupId = 'group1' as OptionGroupId;
  const optA = 'optA' as PlanOptionId;
  const optB = 'optB' as PlanOptionId;
  const itemA = 'itemA' as PlanItemId;
  const itemB = 'itemB' as PlanItemId;

  const result = createOptionGroup(state, {
    id: groupId,
    planVersionId: 'pv1' as PlanVersionId,
    title: 'Test Group',
    options: [
      { id: optA, label: 'Option A', planItemIds: [itemA] },
      { id: optB, label: 'Option B', planItemIds: [itemB] },
    ],
    selectedOptionId: optA,
  });

  assert.ok(result.ok);
  if (!result.ok) return;

  const newState = result.value;
  assert.equal(newState.optionGroups.length, 1);
  assert.equal(newState.optionGroups[0].id, groupId);
  assert.equal(newState.optionGroups[0].selectedOptionId, optA);
  assert.equal(newState.planOptions.length, 2);
  assert.equal(newState.planFragments.length, 2);

  const fragA = newState.planFragments.find((f) => f.id === ('frag_optA' as PlanFragmentId));
  assert.ok(fragA);
  assert.deepEqual(fragA!.planItemIds, [itemA]);

  const optAEntity = newState.planOptions.find((o) => o.id === optA);
  assert.ok(optAEntity);
  assert.equal(optAEntity!.fragmentId, 'frag_optA' as PlanFragmentId);
});

test('createOptionGroup rejects duplicate group id', () => {
  const state = makeState();
  const groupId = 'group1' as OptionGroupId;
  const optA = 'optA' as PlanOptionId;
  const optB = 'optB' as PlanOptionId;
  const itemA = 'itemA' as PlanItemId;
  const itemB = 'itemB' as PlanItemId;

  const first = createOptionGroup(state, {
    id: groupId,
    planVersionId: 'pv1' as PlanVersionId,
    title: 'Test Group',
    options: [
      { id: optA, label: 'Option A', planItemIds: [itemA] },
      { id: optB, label: 'Option B', planItemIds: [itemB] },
    ],
  });
  assert.ok(first.ok);

  const second = createOptionGroup(first.value, {
    id: groupId,
    planVersionId: 'pv1' as PlanVersionId,
    title: 'Test Group 2',
    options: [
      { id: 'optC' as PlanOptionId, label: 'Option C', planItemIds: [itemA] },
      { id: 'optD' as PlanOptionId, label: 'Option D', planItemIds: [itemB] },
    ],
  });

  assert.ok(!second.ok);
  if (!second.ok) {
    assert.match(second.error, /already exists/);
  }
});

test('createOptionGroup rejects non-existent plan item', () => {
  const state = makeState();
  const result = createOptionGroup(state, {
    id: 'group1' as OptionGroupId,
    planVersionId: 'pv1' as PlanVersionId,
    title: 'Test Group',
    options: [
      { id: 'optA' as PlanOptionId, label: 'Option A', planItemIds: ['nonexistent' as PlanItemId] },
      { id: 'optB' as PlanOptionId, label: 'Option B', planItemIds: ['itemA' as PlanItemId] },
    ],
  });

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.match(result.error, /not found/);
  }
});

test('deriveActiveState derives selection from optionGroups and preserves unlinked tasks', () => {
  const state = makeState();
  const groupId = 'group1' as OptionGroupId;
  const optA = 'optA' as PlanOptionId;
  const optB = 'optB' as PlanOptionId;
  const itemA = 'itemA' as PlanItemId;
  const itemB = 'itemB' as PlanItemId;
  const itemC = 'itemC' as PlanItemId;
  const itemD = 'itemD' as PlanItemId;

  const created = createOptionGroup(state, {
    id: groupId,
    planVersionId: 'pv1' as PlanVersionId,
    title: 'Test Group',
    options: [
      { id: optA, label: 'Option A', planItemIds: [itemA, itemB] },
      { id: optB, label: 'Option B', planItemIds: [itemC, itemD] },
    ],
    selectedOptionId: optA,
  });
  assert.ok(created.ok);
  if (!created.ok) return;

  const newState = created.value;
  const active = deriveActiveState(newState);

  const activeIds = new Set(active.planItems.map((i) => i.id));
  assert.ok(activeIds.has(itemA));
  assert.ok(activeIds.has(itemB));
  assert.ok(!activeIds.has(itemC));
  assert.ok(!activeIds.has(itemD));
});

test('previewOptionChange returns preview with groupId, targetId, baseState', () => {
  const state = makeState();
  const groupId = 'group1' as OptionGroupId;
  const optA = 'optA' as PlanOptionId;
  const optB = 'optB' as PlanOptionId;
  const itemA = 'itemA' as PlanItemId;
  const itemB = 'itemB' as PlanItemId;
  const itemC = 'itemC' as PlanItemId;
  const itemD = 'itemD' as PlanItemId;

  const created = createOptionGroup(state, {
    id: groupId,
    planVersionId: 'pv1' as PlanVersionId,
    title: 'Test Group',
    options: [
      { id: optA, label: 'Option A', planItemIds: [itemA, itemB] },
      { id: optB, label: 'Option B', planItemIds: [itemC, itemD] },
    ],
    selectedOptionId: optA,
  });
  assert.ok(created.ok);
  if (!created.ok) return;

  const newState = created.value;
  const previewResult = previewOptionChange(newState, groupId, optB);
  assert.ok(previewResult.ok);
  if (!previewResult.ok) return;

  const preview = previewResult.value;
  assert.equal(preview.groupId, groupId);
  assert.equal(preview.targetId, optB);
  assert.equal(preview.baseState, newState);

  const addedIds = new Set(preview.addedPlanItems.map((i) => i.id));
  assert.ok(addedIds.has(itemC));
  assert.ok(addedIds.has(itemD));

  const removedIds = new Set(preview.removedPlanItems.map((i) => i.id));
  assert.ok(removedIds.has(itemA));
  assert.ok(removedIds.has(itemB));
});

test('commitOptionChange rejects stale preview', () => {
  const state = makeState();
  const groupId = 'group1' as OptionGroupId;
  const optA = 'optA' as PlanOptionId;
  const optB = 'optB' as PlanOptionId;
  const itemA = 'itemA' as PlanItemId;
  const itemB = 'itemB' as PlanItemId;
  const itemC = 'itemC' as PlanItemId;
  const itemD = 'itemD' as PlanItemId;

  const created = createOptionGroup(state, {
    id: groupId,
    planVersionId: 'pv1' as PlanVersionId,
    title: 'Test Group',
    options: [
      { id: optA, label: 'Option A', planItemIds: [itemA, itemB] },
      { id: optB, label: 'Option B', planItemIds: [itemC, itemD] },
    ],
    selectedOptionId: optA,
  });
  assert.ok(created.ok);
  if (!created.ok) return;

  const newState = created.value;
  const previewResult = previewOptionChange(newState, groupId, optB);
  assert.ok(previewResult.ok);
  if (!previewResult.ok) return;

  const preview = previewResult.value;

  const modifiedState = {
    ...newState,
    optionGroups: newState.optionGroups.map((g) =>
      g.id === groupId ? { ...g, selectedOptionId: optB } : g
    ),
  };

  const commitResult = commitOptionChange(modifiedState, preview);
  assert.ok(!commitResult.ok);
  if (!commitResult.ok) {
    assert.match(commitResult.error, /Stale preview/);
  }
});

test('commitOptionChange succeeds with matching state', () => {
  const state = makeState();
  const groupId = 'group1' as OptionGroupId;
  const optA = 'optA' as PlanOptionId;
  const optB = 'optB' as PlanOptionId;
  const itemA = 'itemA' as PlanItemId;
  const itemB = 'itemB' as PlanItemId;
  const itemC = 'itemC' as PlanItemId;
  const itemD = 'itemD' as PlanItemId;

  const created = createOptionGroup(state, {
    id: groupId,
    planVersionId: 'pv1' as PlanVersionId,
    title: 'Test Group',
    options: [
      { id: optA, label: 'Option A', planItemIds: [itemA, itemB] },
      { id: optB, label: 'Option B', planItemIds: [itemC, itemD] },
    ],
    selectedOptionId: optA,
  });
  assert.ok(created.ok);
  if (!created.ok) return;

  const newState = created.value;
  const previewResult = previewOptionChange(newState, groupId, optB);
  assert.ok(previewResult.ok);
  if (!previewResult.ok) return;

  const preview = previewResult.value;
  const commitResult = commitOptionChange(newState, preview);
  assert.ok(commitResult.ok);
  if (!commitResult.ok) return;

  const committedState = commitResult.value;
  const group = committedState.optionGroups.find((g) => g.id === groupId);
  assert.ok(group);
  assert.equal(group!.selectedOptionId, optB);
});

test('previewOptionChange filters booking-subject costs based on active bookings', () => {
  const state = makeState();
  const groupId = 'group1' as OptionGroupId;
  const optA = 'optA' as PlanOptionId;
  const optB = 'optB' as PlanOptionId;
  const itemA = 'itemA' as PlanItemId;
  const itemB = 'itemB' as PlanItemId;
  const itemC = 'itemC' as PlanItemId;
  const itemD = 'itemD' as PlanItemId;

  const bookingA = 'bookingA' as BookingId;
  const bookingB = 'bookingB' as BookingId;
  const costA = 'costA' as CostRecordId;
  const costB = 'costB' as CostRecordId;

  const bookingAEntity: Booking = {
    id: bookingA,
    projectId: 'proj1' as ProjectId,
    planItemIds: [itemA],
    type: 'hotel',
    status: 'confirmed',
  };
  const bookingBEntity: Booking = {
    id: bookingB,
    projectId: 'proj1' as ProjectId,
    planItemIds: [itemC],
    type: 'hotel',
    status: 'confirmed',
  };

  const costAEntity: CostRecord = {
    id: costA,
    projectId: 'proj1' as ProjectId,
    subject: { type: 'booking', id: bookingA },
    type: 'committed',
    category: 'lodging',
    total: { amount: 100, currency: 'JPY' },
  };
  const costBEntity: CostRecord = {
    id: costB,
    projectId: 'proj1' as ProjectId,
    subject: { type: 'booking', id: bookingB },
    type: 'committed',
    category: 'lodging',
    total: { amount: 200, currency: 'JPY' },
  };

  const stateWithBookings: EntityState = {
    ...state,
    bookings: [bookingAEntity, bookingBEntity],
    costRecords: [costAEntity, costBEntity],
  };

  const created = createOptionGroup(stateWithBookings, {
    id: groupId,
    planVersionId: 'pv1' as PlanVersionId,
    title: 'Test Group',
    options: [
      { id: optA, label: 'Option A', planItemIds: [itemA, itemB] },
      { id: optB, label: 'Option B', planItemIds: [itemC, itemD] },
    ],
    selectedOptionId: optA,
  });
  assert.ok(created.ok);
  if (!created.ok) return;

  const newState = created.value;
  const active = deriveActiveState(newState);
  const activeCostIds = new Set(active.costRecords.map((c) => c.id));
  assert.ok(activeCostIds.has(costA));
  assert.ok(!activeCostIds.has(costB));

  const previewResult = previewOptionChange(newState, groupId, optB);
  assert.ok(previewResult.ok);
  if (!previewResult.ok) return;

  const preview = previewResult.value;
  const previewCostIds = new Set(preview.activeState.costRecords.map((c) => c.id));
  assert.ok(previewCostIds.has(costB));
  assert.ok(!previewCostIds.has(costA));

  const affectedCostIds = new Set(preview.affectedCostRecords.map((c) => c.id));
  assert.ok(affectedCostIds.has(costA));
  assert.ok(affectedCostIds.has(costB));
});

test('previewOptionChange does not mutate original state', () => {
  const state = makeState();
  const groupId = 'group1' as OptionGroupId;
  const optA = 'optA' as PlanOptionId;
  const optB = 'optB' as PlanOptionId;
  const itemA = 'itemA' as PlanItemId;
  const itemB = 'itemB' as PlanItemId;
  const itemC = 'itemC' as PlanItemId;
  const itemD = 'itemD' as PlanItemId;

  const created = createOptionGroup(state, {
    id: groupId,
    planVersionId: 'pv1' as PlanVersionId,
    title: 'Test Group',
    options: [
      { id: optA, label: 'Option A', planItemIds: [itemA, itemB] },
      { id: optB, label: 'Option B', planItemIds: [itemC, itemD] },
    ],
    selectedOptionId: optA,
  });
  assert.ok(created.ok);
  if (!created.ok) return;

  const newState = created.value;
  const originalGroup = newState.optionGroups.find((g) => g.id === groupId);
  const originalSelected = originalGroup!.selectedOptionId;

  const previewResult = previewOptionChange(newState, groupId, optB);
  assert.ok(previewResult.ok);

  const groupAfter = newState.optionGroups.find((g) => g.id === groupId);
  assert.equal(groupAfter!.selectedOptionId, originalSelected);
});
