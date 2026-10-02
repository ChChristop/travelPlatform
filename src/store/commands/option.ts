import type { OptionGroup, PlanOption, PlanFragment } from '../../domain/alternatives';
import type { PlanItem } from '../../domain/plan';
import type { Booking } from '../../domain/booking';
import type { Task } from '../../domain/task';
import type { CostRecord } from '../../domain/cost';
import type { Route } from '../../domain/route';
import type { Place } from '../../domain/place';
import type { OptionGroupId, PlanOptionId, PlanFragmentId, PlanItemId, PlanVersionId } from '../../domain/ids';
import type { EntityState } from '../entities/state';

export type CommandResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface OptionDefinition {
  id: PlanOptionId;
  label: string;
  planItemIds: PlanItemId[];
  priority?: number;
  note?: string;
}

export interface CreateOptionGroupInput {
  id: OptionGroupId;
  planVersionId: PlanVersionId;
  title: string;
  options: OptionDefinition[];
  selectedOptionId?: PlanOptionId;
}

export function createOptionGroup(
  state: EntityState,
  input: CreateOptionGroupInput
): CommandResult<EntityState> {
  if (!input.id || typeof input.id !== 'string') {
    return { ok: false, error: 'OptionGroup id is required' };
  }
  if (!input.planVersionId || typeof input.planVersionId !== 'string') {
    return { ok: false, error: 'OptionGroup planVersionId is required' };
  }
  if (!input.title || typeof input.title !== 'string') {
    return { ok: false, error: 'OptionGroup title is required' };
  }
  if (!Array.isArray(input.options) || input.options.length < 2) {
    return { ok: false, error: 'OptionGroup must have at least 2 options' };
  }

  const planVersion = state.planVersions.find((v) => v.id === input.planVersionId);
  if (!planVersion) {
    return { ok: false, error: `PlanVersion ${input.planVersionId} not found` };
  }

  const existingGroup = state.optionGroups.find((g) => g.id === input.id);
  if (existingGroup) {
    return { ok: false, error: `OptionGroup ${input.id} already exists` };
  }

  const planItemIds = new Set(state.planItems.map((i) => i.id));
  const optionIds: PlanOptionId[] = [];
  const newOptions: PlanOption[] = [];
  const newFragments: PlanFragment[] = [];

  for (const opt of input.options) {
    if (!opt.id || typeof opt.id !== 'string') {
      return { ok: false, error: 'Option id is required' };
    }
    if (!opt.label || typeof opt.label !== 'string') {
      return { ok: false, error: 'Option label is required' };
    }
    if (!Array.isArray(opt.planItemIds) || opt.planItemIds.length === 0) {
      return { ok: false, error: `Option ${opt.id} must reference at least one PlanItem` };
    }
    for (const itemId of opt.planItemIds) {
      if (!planItemIds.has(itemId)) {
        return { ok: false, error: `PlanItem ${itemId} not found` };
      }
    }
    const existingOption = state.planOptions.find((o) => o.id === opt.id);
    if (existingOption) {
      return { ok: false, error: `PlanOption ${opt.id} already exists` };
    }

    const fragmentId = `frag_${opt.id}` as PlanFragmentId;
    const existingFragment = state.planFragments.find((f) => f.id === fragmentId);
    if (existingFragment) {
      return { ok: false, error: `PlanFragment ${fragmentId} already exists` };
    }

    const fragment: PlanFragment = {
      id: fragmentId,
      planVersionId: input.planVersionId,
      planItemIds: opt.planItemIds,
    };
    if (opt.priority !== undefined) {
      fragment.note = `priority:${opt.priority}`;
    }
    if (opt.note !== undefined) {
      fragment.note = opt.note;
    }

    const option: PlanOption = {
      id: opt.id,
      planVersionId: input.planVersionId,
      label: opt.label,
      fragmentId: fragmentId,
    };
    if (opt.priority !== undefined) {
      option.priority = opt.priority;
    }
    if (opt.note !== undefined) {
      option.note = opt.note;
    }

    newFragments.push(fragment);
    newOptions.push(option);
    optionIds.push(opt.id);
  }

  if (input.selectedOptionId !== undefined && !optionIds.includes(input.selectedOptionId)) {
    return { ok: false, error: 'selectedOptionId must be one of the provided options' };
  }

  const group: OptionGroup = {
    id: input.id,
    planVersionId: input.planVersionId,
    title: input.title,
    optionIds,
  };
  if (input.selectedOptionId !== undefined) {
    group.selectedOptionId = input.selectedOptionId;
  }

  return {
    ok: true,
    value: {
      ...state,
      planFragments: [...state.planFragments, ...newFragments],
      planOptions: [...state.planOptions, ...newOptions],
      optionGroups: [...state.optionGroups, group],
    },
  };
}

export interface ActiveState {
  planItems: PlanItem[];
  bookings: Booking[];
  tasks: Task[];
  costRecords: CostRecord[];
  routes: Route[];
  places: Place[];
}

export function deriveActiveState(state: EntityState): ActiveState {
  const selectedOptionIds: PlanOptionId[] = [];
  for (const group of state.optionGroups) {
    if (group.selectedOptionId) {
      selectedOptionIds.push(group.selectedOptionId);
    }
  }

  const selectedFragments = new Set<PlanFragmentId>();
  for (const optionId of selectedOptionIds) {
    const option = state.planOptions.find((o) => o.id === optionId);
    if (option) {
      selectedFragments.add(option.fragmentId);
    }
  }

  const selectedFragmentItemIds = new Set<PlanItemId>();
  for (const fragmentId of selectedFragments) {
    const fragment = state.planFragments.find((f) => f.id === fragmentId);
    if (fragment) {
      for (const itemId of fragment.planItemIds) {
        selectedFragmentItemIds.add(itemId);
      }
    }
  }

  const groupedItemIds = new Set<PlanItemId>();
  for (const group of state.optionGroups) {
    for (const optionId of group.optionIds) {
      const option = state.planOptions.find((o) => o.id === optionId);
      if (option) {
        const fragment = state.planFragments.find((f) => f.id === option.fragmentId);
        if (fragment) {
          for (const itemId of fragment.planItemIds) {
            groupedItemIds.add(itemId);
          }
        }
      }
    }
  }

  const activeItemIds = new Set<PlanItemId>();
  for (const item of state.planItems) {
    if (!groupedItemIds.has(item.id)) {
      activeItemIds.add(item.id);
    }
  }
  for (const itemId of selectedFragmentItemIds) {
    activeItemIds.add(itemId);
  }

  const activePlanItems = state.planItems.filter((item) => activeItemIds.has(item.id));
  const activeBookingIds = new Set(activePlanItems.map((item) => item.id));
  const activeBookings = state.bookings.filter((b) => b.planItemIds.some((id) => activeBookingIds.has(id)));
  const activeTaskIds = new Set(activePlanItems.map((item) => item.id));
  const activeTasks = state.tasks.filter((t) => !t.linkedPlanItemId || activeTaskIds.has(t.linkedPlanItemId));
  const activeCostRecords = state.costRecords.filter((c) => {
    if (c.subject.type === 'planItem') {
      return activeItemIds.has(c.subject.id);
    }
    if (c.subject.type === 'booking') {
      return activeBookings.some((b) => b.id === c.subject.id);
    }
    return true;
  });
  const activeRouteIds = new Set(activePlanItems.flatMap((item) => item.routeIds ?? []));
  const activeRoutes = state.routes.filter((r) => activeRouteIds.has(r.id));
  const activePlaceIds = new Set(activePlanItems.flatMap((item) => item.places.map((p) => p.placeId)));
  const activePlaces = state.places.filter((p) => activePlaceIds.has(p.id));

  return {
    planItems: activePlanItems,
    bookings: activeBookings,
    tasks: activeTasks,
    costRecords: activeCostRecords,
    routes: activeRoutes,
    places: activePlaces,
  };
}

export interface PreviewState {
  groupId: OptionGroupId;
  targetId: PlanOptionId;
  baseState: EntityState;
  activeState: ActiveState;
  addedPlanItems: PlanItem[];
  removedPlanItems: PlanItem[];
  affectedBookings: Booking[];
  affectedTasks: Task[];
  affectedCostRecords: CostRecord[];
  affectedRoutes: Route[];
  affectedPlaces: Place[];
}

export function previewOptionChange(
  state: EntityState,
  optionGroupId: OptionGroupId,
  newSelectedOptionId: PlanOptionId
): CommandResult<PreviewState> {
  const group = state.optionGroups.find((g) => g.id === optionGroupId);
  if (!group) {
    return { ok: false, error: `OptionGroup ${optionGroupId} not found` };
  }
  if (!group.optionIds.includes(newSelectedOptionId)) {
    return { ok: false, error: `Option ${newSelectedOptionId} is not in group ${optionGroupId}` };
  }

  const currentSelectedId = group.selectedOptionId;

  const newSelectedOptionIds: PlanOptionId[] = [];
  for (const g of state.optionGroups) {
    if (g.id === optionGroupId) {
      newSelectedOptionIds.push(newSelectedOptionId);
    } else if (g.selectedOptionId) {
      newSelectedOptionIds.push(g.selectedOptionId);
    }
  }

  const newState: EntityState = {
    ...state,
    optionGroups: state.optionGroups.map((g) =>
      g.id === optionGroupId ? { ...g, selectedOptionId: newSelectedOptionId } : g
    ),
  };

  const newActiveState = deriveActiveState(newState);

  const oldSelectedOptionIds: PlanOptionId[] = [];
  for (const g of state.optionGroups) {
    if (g.id === optionGroupId) {
      if (currentSelectedId) oldSelectedOptionIds.push(currentSelectedId);
    } else if (g.selectedOptionId) {
      oldSelectedOptionIds.push(g.selectedOptionId);
    }
  }

  const oldActiveState = deriveActiveState(state);

  const oldItemIds = new Set(oldActiveState.planItems.map((i) => i.id));
  const newItemIds = new Set(newActiveState.planItems.map((i) => i.id));

  const addedPlanItems = newActiveState.planItems.filter((i) => !oldItemIds.has(i.id));
  const removedPlanItems = oldActiveState.planItems.filter((i) => !newItemIds.has(i.id));

  const oldBookingIds = new Set(oldActiveState.bookings.map((b) => b.id));
  const newBookingIds = new Set(newActiveState.bookings.map((b) => b.id));
  const affectedBookings = [
    ...newActiveState.bookings.filter((b) => !oldBookingIds.has(b.id)),
    ...oldActiveState.bookings.filter((b) => !newBookingIds.has(b.id)),
  ];

  const oldTaskIds = new Set(oldActiveState.tasks.map((t) => t.id));
  const newTaskIds = new Set(newActiveState.tasks.map((t) => t.id));
  const affectedTasks = [
    ...newActiveState.tasks.filter((t) => !oldTaskIds.has(t.id)),
    ...oldActiveState.tasks.filter((t) => !newTaskIds.has(t.id)),
  ];

  const oldCostIds = new Set(oldActiveState.costRecords.map((c) => c.id));
  const newCostIds = new Set(newActiveState.costRecords.map((c) => c.id));
  const affectedCostRecords = [
    ...newActiveState.costRecords.filter((c) => !oldCostIds.has(c.id)),
    ...oldActiveState.costRecords.filter((c) => !newCostIds.has(c.id)),
  ];

  const oldRouteIds = new Set(oldActiveState.routes.map((r) => r.id));
  const newRouteIds = new Set(newActiveState.routes.map((r) => r.id));
  const affectedRoutes = [
    ...newActiveState.routes.filter((r) => !oldRouteIds.has(r.id)),
    ...oldActiveState.routes.filter((r) => !newRouteIds.has(r.id)),
  ];

  const oldPlaceIds = new Set(oldActiveState.places.map((p) => p.id));
  const newPlaceIds = new Set(newActiveState.places.map((p) => p.id));
  const affectedPlaces = [
    ...newActiveState.places.filter((p) => !oldPlaceIds.has(p.id)),
    ...oldActiveState.places.filter((p) => !newPlaceIds.has(p.id)),
  ];

  return {
    ok: true,
    value: {
      groupId: optionGroupId,
      targetId: newSelectedOptionId,
      baseState: state,
      activeState: newActiveState,
      addedPlanItems,
      removedPlanItems,
      affectedBookings,
      affectedTasks,
      affectedCostRecords,
      affectedRoutes,
      affectedPlaces,
    },
  };
}

export function commitOptionChange(
  state: EntityState,
  preview: PreviewState
): CommandResult<EntityState> {
  if (preview.baseState !== state) {
    return { ok: false, error: 'Stale preview: state has changed since preview was created' };
  }
  const group = state.optionGroups.find((g) => g.id === preview.groupId);
  if (!group) {
    return { ok: false, error: `OptionGroup ${preview.groupId} not found` };
  }
  if (!group.optionIds.includes(preview.targetId)) {
    return { ok: false, error: `Option ${preview.targetId} is not in group ${preview.groupId}` };
  }
  const updatedGroups = state.optionGroups.map((g) =>
    g.id === preview.groupId ? { ...g, selectedOptionId: preview.targetId } : g
  );
  return {
    ok: true,
    value: {
      ...state,
      optionGroups: updatedGroups,
    },
  };
}
