import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEntityState } from '../../../src/store/entities/state.ts';
import { validateReferenceRules } from '../../../src/domain/validation/reference-rules.ts';
import { validateValueRules } from '../../../src/domain/validation/value-rules.ts';
import { createValidStateInput } from './fixtures.ts';
import type { ProjectId, PlanOptionId } from '../../../src/domain';

test('state factory returns ok with valid state', () => {
  const input = createValidStateInput();
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.state.projects.length, 1);
    assert.equal(result.state.planVersions.length, 1);
    assert.equal(result.state.planItems.length, 1);
    assert.equal(result.state.places.length, 1);
    assert.equal(result.state.costRecords.length, 1);
    assert.equal(result.state.optionGroups.length, 1);
    assert.equal(result.state.planOptions.length, 2);
    assert.equal(result.state.planFragments.length, 1);
    assert.equal(result.state.tripRuns.length, 1);
    assert.equal(result.state.itemExecutions.length, 1);
  }
});

test('state factory returns errors for duplicate IDs', () => {
  const input = createValidStateInput();
  // Add duplicate place
  const duplicatePlace = { ...input.places[0] };
  input.places.push(duplicatePlace);
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const dupError = result.errors.find(e => e.code === 'duplicate-id');
    assert.ok(dupError);
    assert.equal(dupError.entityType, 'Place');
  }
});

test('state factory returns errors for dangling place reference', () => {
  const input = createValidStateInput();
  // Remove the place that planItem references
  input.places = [];
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const danglingError = result.errors.find(e => e.code === 'dangling-reference');
    assert.ok(danglingError);
    assert.equal(danglingError.entityType, 'PlanItem');
  }
});

test('state factory returns errors for dangling planVersion reference', () => {
  const input = createValidStateInput();
  // Remove the planVersion that planItem references
  input.planVersions = [];
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const danglingError = result.errors.find(e => e.code === 'dangling-reference' && e.entityType === 'PlanItem');
    assert.ok(danglingError);
  }
});

test('state factory returns errors for dangling costRecord subject', () => {
  const input = createValidStateInput();
  // Remove the planItem that costRecord references
  input.planItems = [];
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const danglingError = result.errors.find(e => e.code === 'dangling-reference' && e.entityType === 'CostRecord');
    assert.ok(danglingError);
  }
});

test('state factory returns errors for ownership mismatch', () => {
  const input = createValidStateInput();
  // Change costRecord projectId to mismatch with planVersion projectId
  input.costRecords[0].projectId = 'proj-2' as ProjectId;
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const ownershipError = result.errors.find(e => e.code === 'ownership-mismatch');
    assert.ok(ownershipError);
    assert.equal(ownershipError.entityType, 'CostRecord');
  }
});

test('state factory returns errors for option not in group', () => {
  const input = createValidStateInput();
  // Set selectedOptionId to an option that is not in optionIds
  input.optionGroups[0].selectedOptionId = 'opt-3' as PlanOptionId;
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const optionError = result.errors.find(e => e.code === 'option-not-in-group');
    assert.ok(optionError);
    assert.equal(optionError.entityType, 'OptionGroup');
  }
});

test('state factory returns errors for invalid date order in schedule', () => {
  const input = createValidStateInput();
  // Set start after end
  input.planItems[0].schedule.start = '2026-09-26T12:00:00+09:00';
  input.planItems[0].schedule.end = '2026-09-26T10:00:00+09:00';
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const dateError = result.errors.find(e => e.code === 'invalid-date-order' && e.entityType === 'PlanItem');
    assert.ok(dateError);
  }
});

test('state factory returns errors for invalid date order in tripRun', () => {
  const input = createValidStateInput();
  // Set startedAt after completedAt
  input.tripRuns[0].startedAt = '2026-09-26T12:00:00+09:00';
  input.tripRuns[0].completedAt = '2026-09-26T10:00:00+09:00';
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const dateError = result.errors.find(e => e.code === 'invalid-date-order' && e.entityType === 'TripRun');
    assert.ok(dateError);
  }
});

test('state factory returns errors for invalid date order in itemExecution', () => {
  const input = createValidStateInput();
  // Set actualStart after actualEnd
  input.itemExecutions[0].actualStart = '2026-09-26T12:00:00+09:00';
  input.itemExecutions[0].actualEnd = '2026-09-26T10:00:00+09:00';
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const dateError = result.errors.find(e => e.code === 'invalid-date-order' && e.entityType === 'ItemExecution');
    assert.ok(dateError);
  }
});

test('state factory returns errors for non-finite money amount', () => {
  const input = createValidStateInput();
  // Set money amount to NaN
  input.moneyValues = [{ amount: NaN, currency: 'JPY' }];
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const finiteError = result.errors.find(e => e.code === 'non-finite-value' && e.entityType === 'Money');
    assert.ok(finiteError);
  }
});

test('state factory returns errors for negative money amount', () => {
  const input = createValidStateInput();
  // Set money amount to negative
  input.moneyValues = [{ amount: -100, currency: 'JPY' }];
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const finiteError = result.errors.find(e => e.code === 'non-finite-value' && e.entityType === 'Money');
    assert.ok(finiteError);
  }
});

test('state factory returns errors for invalid latitude', () => {
  const input = createValidStateInput();
  // Set latitude out of range
  input.places[0].coordinates = { lat: 95, lng: 135.5326 };
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const finiteError = result.errors.find(e => e.code === 'non-finite-value' && e.entityType === 'Place');
    assert.ok(finiteError);
  }
});

test('state factory returns errors for invalid longitude', () => {
  const input = createValidStateInput();
  // Set longitude out of range
  input.places[0].coordinates = { lat: 34.6851, lng: 190 };
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length > 0);
    const finiteError = result.errors.find(e => e.code === 'non-finite-value' && e.entityType === 'Place');
    assert.ok(finiteError);
  }
});

test('state factory collects multiple errors', () => {
  const input = createValidStateInput();
  // Add multiple errors: duplicate place, invalid date, invalid money
  const duplicatePlace = { ...input.places[0] };
  input.places.push(duplicatePlace);
  input.planItems[0].schedule.start = '2026-09-26T12:00:00+09:00';
  input.planItems[0].schedule.end = '2026-09-26T10:00:00+09:00';
  input.moneyValues = [{ amount: NaN, currency: 'JPY' }];
  
  const result = createEntityState(input, validateReferenceRules, validateValueRules);
  
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.length >= 3);
    const codes = result.errors.map(e => e.code);
    assert.ok(codes.includes('duplicate-id'));
    assert.ok(codes.includes('invalid-date-order'));
    assert.ok(codes.includes('non-finite-value'));
  }
});
