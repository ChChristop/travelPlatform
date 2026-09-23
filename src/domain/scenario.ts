import type { ScenarioId, ConstraintId, PlanVersionId, PlanItemId, OptionGroupId, PlanOptionId } from './ids';

export type ScenarioType = 'normal' | 'weather' | 'delay' | 'budget' | 'fatigue' | 'custom';

export interface Scenario {
  id: ScenarioId;
  planVersionId: PlanVersionId;
  title: string;
  type: ScenarioType;
  variables: Record<string, unknown>;
  optionSelections: {
    optionGroupId: OptionGroupId;
    optionId: PlanOptionId;
  }[];
}

export type ConstraintType =
  | 'fixedTime'
  | 'timeWindow'
  | 'minDuration'
  | 'maxDuration'
  | 'mustBefore'
  | 'mustAfter'
  | 'openingHours'
  | 'reservation'
  | 'budget'
  | 'weather'
  | 'distance';

export type ConstraintHardness = 'hard' | 'soft';

export interface Constraint {
  id: ConstraintId;
  planVersionId: PlanVersionId;
  subjectId: PlanItemId;
  type: ConstraintType;
  value: unknown;
  hardness: ConstraintHardness;
}
