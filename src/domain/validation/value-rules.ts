import type { ValidationError } from './errors';
import type { OptionGroup, PlanOption } from '../alternatives';
import type { Schedule, PlanItem } from '../plan';
import type { TripRun, ItemExecution } from '../run';
import type { Place } from '../place';
import type { Money } from '../money';

export interface ValueRuleInput {
  optionGroups: OptionGroup[];
  planOptions: PlanOption[];
  planItems: PlanItem[];
  tripRuns: TripRun[];
  itemExecutions: ItemExecution[];
  places: Place[];
  moneyValues?: Money[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateOptionGroups(
  optionGroups: OptionGroup[],
  planOptions: PlanOption[],
): ValidationError[] {
  const errors: ValidationError[] = [];
  const optionIdSet = new Set<string>(planOptions.map((o) => o.id));

  for (const group of optionGroups) {
    if (group.selectedOptionId !== undefined) {
      if (!optionIdSet.has(group.selectedOptionId)) {
        errors.push({
          code: 'option-not-in-group',
          entityType: 'OptionGroup',
          entityId: group.id,
          message: `OptionGroup '${group.id}' selectedOptionId '${group.selectedOptionId}' is not in optionIds or planOptions.`,
        });
      }
    }
  }

  return errors;
}

function validateDateOrder(
  planItems: PlanItem[],
  tripRuns: TripRun[],
  itemExecutions: ItemExecution[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const item of planItems) {
    const schedule: Schedule = item.schedule;
    if (schedule.start !== undefined && schedule.end !== undefined) {
      const start = new Date(schedule.start).getTime();
      const end = new Date(schedule.end).getTime();
      if (start > end) {
        errors.push({
          code: 'invalid-date-order',
          entityType: 'PlanItem',
          entityId: item.id,
          message: `PlanItem '${item.id}' schedule.start (${schedule.start}) is after schedule.end (${schedule.end}).`,
        });
      }
    }
  }

  for (const run of tripRuns) {
    if (run.startedAt !== undefined && run.completedAt !== undefined) {
      const started = new Date(run.startedAt).getTime();
      const completed = new Date(run.completedAt).getTime();
      if (started > completed) {
        errors.push({
          code: 'invalid-date-order',
          entityType: 'TripRun',
          entityId: run.id,
          message: `TripRun '${run.id}' startedAt (${run.startedAt}) is after completedAt (${run.completedAt}).`,
        });
      }
    }
  }

  for (const exec of itemExecutions) {
    if (exec.actualStart !== undefined && exec.actualEnd !== undefined) {
      const actualStart = new Date(exec.actualStart).getTime();
      const actualEnd = new Date(exec.actualEnd).getTime();
      if (actualStart > actualEnd) {
        errors.push({
          code: 'invalid-date-order',
          entityType: 'ItemExecution',
          entityId: exec.id,
          message: `ItemExecution '${exec.id}' actualStart (${exec.actualStart}) is after actualEnd (${exec.actualEnd}).`,
        });
      }
    }
  }

  return errors;
}

function validateFiniteValues(
  places: Place[],
  moneyValues: Money[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const place of places) {
    if (place.coordinates !== undefined) {
      const { lat, lng } = place.coordinates;
      if (!isFiniteNumber(lat) || lat < -90 || lat > 90) {
        errors.push({
          code: 'non-finite-value',
          entityType: 'Place',
          entityId: place.id,
          message: `Place '${place.id}' coordinates.lat is invalid: ${lat}. Must be finite and in [-90, 90].`,
        });
      }
      if (!isFiniteNumber(lng) || lng < -180 || lng > 180) {
        errors.push({
          code: 'non-finite-value',
          entityType: 'Place',
          entityId: place.id,
          message: `Place '${place.id}' coordinates.lng is invalid: ${lng}. Must be finite and in [-180, 180].`,
        });
      }
    }
  }

  for (const money of moneyValues) {
    if (!isFiniteNumber(money.amount) || money.amount < 0) {
      errors.push({
        code: 'non-finite-value',
        entityType: 'Money',
        message: `Money amount is invalid: ${money.amount}. Must be finite and non-negative.`,
      });
    }
  }

  return errors;
}

export function validateValueRules(input: ValueRuleInput): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...validateOptionGroups(input.optionGroups, input.planOptions));
  errors.push(...validateDateOrder(input.planItems, input.tripRuns, input.itemExecutions));
  errors.push(...validateFiniteValues(input.places, input.moneyValues ?? []));
  return errors;
}
