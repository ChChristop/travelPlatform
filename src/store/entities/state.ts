import type { ValidationError } from '../../domain/validation/errors';
import type { validateReferenceRules } from '../../domain/validation/reference-rules';
import type { validateValueRules, ValueRuleInput } from '../../domain/validation/value-rules';
import type { TravelProject } from '../../domain/project';
import type { PlanVersion, PlanItem } from '../../domain/plan';
import type { Place } from '../../domain/place';
import type { Booking } from '../../domain/booking';
import type { CostRecord } from '../../domain/cost';
import type { Route } from '../../domain/route';
import type { Task } from '../../domain/task';
import type { PlanFragment, PlanOption, OptionGroup } from '../../domain/alternatives';
import type { Scenario, Constraint } from '../../domain/scenario';
import type { TripRun, ItemExecution } from '../../domain/run';
import type { Money } from '../../domain/money';

export interface EntityState {
  projects: TravelProject[];
  planVersions: PlanVersion[];
  planItems: PlanItem[];
  places: Place[];
  bookings: Booking[];
  costRecords: CostRecord[];
  routes: Route[];
  tasks: Task[];
  planFragments: PlanFragment[];
  planOptions: PlanOption[];
  optionGroups: OptionGroup[];
  scenarios: Scenario[];
  constraints: Constraint[];
  tripRuns: TripRun[];
  itemExecutions: ItemExecution[];
}

export type StateFactoryResult =
  | { ok: true; state: EntityState }
  | { ok: false; errors: ValidationError[] };

export interface StateFactoryInput {
  projects: TravelProject[];
  planVersions: PlanVersion[];
  planItems: PlanItem[];
  places: Place[];
  bookings: Booking[];
  costRecords: CostRecord[];
  routes: Route[];
  tasks: Task[];
  planFragments: PlanFragment[];
  planOptions: PlanOption[];
  optionGroups: OptionGroup[];
  scenarios: Scenario[];
  constraints: Constraint[];
  tripRuns: TripRun[];
  itemExecutions: ItemExecution[];
  moneyValues?: Money[];
}

export function createEntityState(
  input: StateFactoryInput,
  referenceValidator: typeof validateReferenceRules,
  valueValidator: typeof validateValueRules,
): StateFactoryResult {
  const referenceErrors = referenceValidator(input);
  const valueInput: ValueRuleInput = {
    optionGroups: input.optionGroups,
    planOptions: input.planOptions,
    planItems: input.planItems,
    tripRuns: input.tripRuns,
    itemExecutions: input.itemExecutions,
    places: input.places,
    moneyValues: input.moneyValues ?? [],
  };
  const valueErrors = valueValidator(valueInput);

  const allErrors = [...referenceErrors, ...valueErrors];

  if (allErrors.length > 0) {
    return { ok: false, errors: allErrors };
  }

  return {
    ok: true,
    state: {
      projects: input.projects,
      planVersions: input.planVersions,
      planItems: input.planItems,
      places: input.places,
      bookings: input.bookings,
      costRecords: input.costRecords,
      routes: input.routes,
      tasks: input.tasks,
      planFragments: input.planFragments,
      planOptions: input.planOptions,
      optionGroups: input.optionGroups,
      scenarios: input.scenarios,
      constraints: input.constraints,
      tripRuns: input.tripRuns,
      itemExecutions: input.itemExecutions,
    },
  };
}
