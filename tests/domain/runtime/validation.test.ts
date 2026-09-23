import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateReferenceRules } from '../../../src/domain/validation/reference-rules.ts';
import { validateValueRules } from '../../../src/domain/validation/value-rules.ts';
import { createValidStateInput } from './fixtures.ts';
import type { ProjectId, PlanOptionId } from '../../../src/domain';

test('reference rules: valid input passes', () => {
  const input = createValidStateInput();
  const errors = validateReferenceRules(input);
  assert.equal(errors.length, 0);
});

test('reference rules: duplicate place ID', () => {
  const input = createValidStateInput();
  const duplicatePlace = { ...input.places[0] };
  input.places.push(duplicatePlace);
  
  const errors = validateReferenceRules(input);
  assert.ok(errors.length > 0);
  const dupError = errors.find(e => e.code === 'duplicate-id' && e.entityType === 'Place');
  assert.ok(dupError);
});

test('reference rules: duplicate planVersion ID', () => {
  const input = createValidStateInput();
  const duplicateVersion = { ...input.planVersions[0] };
  input.planVersions.push(duplicateVersion);
  
  const errors = validateReferenceRules(input);
  assert.ok(errors.length > 0);
  const dupError = errors.find(e => e.code === 'duplicate-id' && e.entityType === 'PlanVersion');
  assert.ok(dupError);
});

test('reference rules: duplicate planItem ID', () => {
  const input = createValidStateInput();
  const duplicateItem = { ...input.planItems[0] };
  input.planItems.push(duplicateItem);
  
  const errors = validateReferenceRules(input);
  assert.ok(errors.length > 0);
  const dupError = errors.find(e => e.code === 'duplicate-id' && e.entityType === 'PlanItem');
  assert.ok(dupError);
});

test('reference rules: duplicate costRecord ID', () => {
  const input = createValidStateInput();
  const duplicateRecord = { ...input.costRecords[0] };
  input.costRecords.push(duplicateRecord);
  
  const errors = validateReferenceRules(input);
  assert.ok(errors.length > 0);
  const dupError = errors.find(e => e.code === 'duplicate-id' && e.entityType === 'CostRecord');
  assert.ok(dupError);
});

test('reference rules: dangling place reference', () => {
  const input = createValidStateInput();
  input.places = [];
  
  const errors = validateReferenceRules(input);
  assert.ok(errors.length > 0);
  const danglingError = errors.find(e => e.code === 'dangling-reference' && e.entityType === 'PlanItem');
  assert.ok(danglingError);
});

test('reference rules: dangling planVersion reference', () => {
  const input = createValidStateInput();
  input.planVersions = [];
  
  const errors = validateReferenceRules(input);
  assert.ok(errors.length > 0);
  const danglingError = errors.find(e => e.code === 'dangling-reference' && e.entityType === 'PlanItem');
  assert.ok(danglingError);
});

test('reference rules: dangling costRecord subject', () => {
  const input = createValidStateInput();
  input.planItems = [];
  
  const errors = validateReferenceRules(input);
  assert.ok(errors.length > 0);
  const danglingError = errors.find(e => e.code === 'dangling-reference' && e.entityType === 'CostRecord');
  assert.ok(danglingError);
});

test('reference rules: ownership mismatch', () => {
  const input = createValidStateInput();
  input.costRecords[0].projectId = 'proj-2' as ProjectId;
  
  const errors = validateReferenceRules(input);
  assert.ok(errors.length > 0);
  const ownershipError = errors.find(e => e.code === 'ownership-mismatch');
  assert.ok(ownershipError);
});

test('value rules: valid input passes', () => {
  const input = createValidStateInput();
  const errors = validateValueRules(input);
  assert.equal(errors.length, 0);
});

test('value rules: option not in group', () => {
  const input = createValidStateInput();
  input.optionGroups[0].selectedOptionId = 'opt-3' as PlanOptionId;
  
  const errors = validateValueRules(input);
  assert.ok(errors.length > 0);
  const optionError = errors.find(e => e.code === 'option-not-in-group');
  assert.ok(optionError);
});

test('value rules: invalid schedule date order', () => {
  const input = createValidStateInput();
  input.planItems[0].schedule.start = '2026-09-26T12:00:00+09:00';
  input.planItems[0].schedule.end = '2026-09-26T10:00:00+09:00';
  
  const errors = validateValueRules(input);
  assert.ok(errors.length > 0);
  const dateError = errors.find(e => e.code === 'invalid-date-order' && e.entityType === 'PlanItem');
  assert.ok(dateError);
});

test('value rules: invalid tripRun date order', () => {
  const input = createValidStateInput();
  input.tripRuns[0].startedAt = '2026-09-26T12:00:00+09:00';
  input.tripRuns[0].completedAt = '2026-09-26T10:00:00+09:00';
  
  const errors = validateValueRules(input);
  assert.ok(errors.length > 0);
  const dateError = errors.find(e => e.code === 'invalid-date-order' && e.entityType === 'TripRun');
  assert.ok(dateError);
});

test('value rules: invalid itemExecution date order', () => {
  const input = createValidStateInput();
  input.itemExecutions[0].actualStart = '2026-09-26T12:00:00+09:00';
  input.itemExecutions[0].actualEnd = '2026-09-26T10:00:00+09:00';
  
  const errors = validateValueRules(input);
  assert.ok(errors.length > 0);
  const dateError = errors.find(e => e.code === 'invalid-date-order' && e.entityType === 'ItemExecution');
  assert.ok(dateError);
});

test('value rules: NaN money amount', () => {
  const input = createValidStateInput();
  input.moneyValues = [{ amount: NaN, currency: 'JPY' }];
  
  const errors = validateValueRules(input);
  assert.ok(errors.length > 0);
  const finiteError = errors.find(e => e.code === 'non-finite-value' && e.entityType === 'Money');
  assert.ok(finiteError);
});

test('value rules: Infinity money amount', () => {
  const input = createValidStateInput();
  input.moneyValues = [{ amount: Infinity, currency: 'JPY' }];
  
  const errors = validateValueRules(input);
  assert.ok(errors.length > 0);
  const finiteError = errors.find(e => e.code === 'non-finite-value' && e.entityType === 'Money');
  assert.ok(finiteError);
});

test('value rules: negative money amount', () => {
  const input = createValidStateInput();
  input.moneyValues = [{ amount: -100, currency: 'JPY' }];
  
  const errors = validateValueRules(input);
  assert.ok(errors.length > 0);
  const finiteError = errors.find(e => e.code === 'non-finite-value' && e.entityType === 'Money');
  assert.ok(finiteError);
});

test('value rules: invalid latitude out of range', () => {
  const input = createValidStateInput();
  input.places[0].coordinates = { lat: 95, lng: 135.5326 };
  
  const errors = validateValueRules(input);
  assert.ok(errors.length > 0);
  const finiteError = errors.find(e => e.code === 'non-finite-value' && e.entityType === 'Place');
  assert.ok(finiteError);
});

test('value rules: invalid latitude NaN', () => {
  const input = createValidStateInput();
  input.places[0].coordinates = { lat: NaN, lng: 135.5326 };
  
  const errors = validateValueRules(input);
  assert.ok(errors.length > 0);
  const finiteError = errors.find(e => e.code === 'non-finite-value' && e.entityType === 'Place');
  assert.ok(finiteError);
});

test('value rules: invalid longitude out of range', () => {
  const input = createValidStateInput();
  input.places[0].coordinates = { lat: 34.6851, lng: 190 };
  
  const errors = validateValueRules(input);
  assert.ok(errors.length > 0);
  const finiteError = errors.find(e => e.code === 'non-finite-value' && e.entityType === 'Place');
  assert.ok(finiteError);
});

test('value rules: invalid longitude Infinity', () => {
  const input = createValidStateInput();
  input.places[0].coordinates = { lat: 34.6851, lng: Infinity };
  
  const errors = validateValueRules(input);
  assert.ok(errors.length > 0);
  const finiteError = errors.find(e => e.code === 'non-finite-value' && e.entityType === 'Place');
  assert.ok(finiteError);
});

test('value rules: multiple errors collected', () => {
  const input = createValidStateInput();
  input.optionGroups[0].selectedOptionId = 'opt-3' as PlanOptionId;
  input.planItems[0].schedule.start = '2026-09-26T12:00:00+09:00';
  input.planItems[0].schedule.end = '2026-09-26T10:00:00+09:00';
  input.moneyValues = [{ amount: NaN, currency: 'JPY' }];
  
  const errors = validateValueRules(input);
  assert.ok(errors.length >= 3);
  const codes = errors.map(e => e.code);
  assert.ok(codes.includes('option-not-in-group'));
  assert.ok(codes.includes('invalid-date-order'));
  assert.ok(codes.includes('non-finite-value'));
});
