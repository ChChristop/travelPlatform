import type { PlanFragmentId, PlanOptionId, OptionGroupId, PlanItemId, RouteId, TaskId, PlanVersionId } from './ids';

export interface PlanFragment {
  id: PlanFragmentId;
  planVersionId: PlanVersionId;
  title?: string;
  planItemIds: PlanItemId[];
  routeIds?: RouteId[];
  taskIds?: TaskId[];
  note?: string;
}

export interface PlanOption {
  id: PlanOptionId;
  planVersionId: PlanVersionId;
  label: string;
  fragmentId: PlanFragmentId;
  priority?: number;
  note?: string;
}

export interface OptionGroup {
  id: OptionGroupId;
  planVersionId: PlanVersionId;
  title: string;
  optionIds: PlanOptionId[];
  selectedOptionId?: PlanOptionId;
}
