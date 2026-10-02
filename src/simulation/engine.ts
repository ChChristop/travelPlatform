import type { EntityState } from '../store/entities/state.ts';
import type { Scenario } from '../domain/scenario.ts';
import type { PlanItem, PlanVersion } from '../domain/plan.ts';
import type { Place } from '../domain/place.ts';
import type { Route } from '../domain/route.ts';
import type { Constraint } from '../domain/scenario.ts';
import type { PlanOptionId, OptionGroupId, PlanVersionId, PlanItemId, PlaceId, RouteId } from '../domain/ids.ts';
import { deriveActiveState } from '../store/commands/option.ts';
import type { ActiveState } from '../store/commands/option.ts';

export interface SimulationConfig {
  entityState: EntityState;
  planVersionId: PlanVersionId;
  scenario?: Scenario | null;
  seed: number;
  initialClockMs?: number;
  initialSpeed?: number;
}

export interface SimulationBounds {
  startMs: number;
  endMs: number;
}

export interface SimulationSession {
  source: EntityState;
  planVersionId: PlanVersionId;
  scenario: Scenario | null;
  seed: number;
  clockMs: number;
  playing: boolean;
  speed: number;
  bounds: SimulationBounds;
}

export interface ProjectedItem {
  id: PlanItemId;
  title: string;
  startMs: number;
  endMs: number;
  allDay: boolean;
  placeId: PlaceId | null;
  placeName: string | null;
  routeId: RouteId | null;
}

export interface SimulationWarning {
  type: 'fixedTime' | 'routeMissing' | 'routeUnusable';
  itemId: PlanItemId;
  message: string;
}

export interface SimulationSnapshot {
  clockMs: number;
  bounds: SimulationBounds;
  playing: boolean;
  speed: number;
  current: ProjectedItem | null;
  next: ProjectedItem | null;
  warnings: SimulationWarning[];
}

function parseIsoToMs(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return t;
}

function getScheduleMs(item: PlanItem): { startMs: number | null; endMs: number | null; allDay: boolean } {
  const s = item.schedule;
  const allDay = s.allDay === true;
  let startMs: number | null = null;
  let endMs: number | null = null;

  if (s.start) {
    startMs = parseIsoToMs(s.start);
  }
  if (s.end) {
    endMs = parseIsoToMs(s.end);
  }

  return { startMs, endMs, allDay };
}

function computeBounds(items: PlanItem[]): SimulationBounds {
  let minMs = Infinity;
  let maxMs = -Infinity;
  let hasItems = false;

  for (const item of items) {
    const { startMs, endMs } = getScheduleMs(item);
    if (startMs !== null) {
      if (startMs < minMs) minMs = startMs;
      if (startMs > maxMs) maxMs = startMs;
      hasItems = true;
    }
    if (endMs !== null) {
      if (endMs > maxMs) maxMs = endMs;
      hasItems = true;
    }
  }

  if (!hasItems) {
    throw new Error('No scheduled items found for plan version');
  }

  if (maxMs < minMs) {
    throw new Error('Invalid bounds: end is before start');
  }

  return { startMs: minMs, endMs: maxMs };
}

function getPrimaryPlace(item: PlanItem, places: Place[]): { placeId: PlaceId | null; placeName: string | null } {
  const primaryRef = item.places.find(p => p.role === 'primary');
  if (!primaryRef) {
    return { placeId: null, placeName: null };
  }
  const place = places.find(p => p.id === primaryRef.placeId);
  if (!place) {
    return { placeId: primaryRef.placeId, placeName: null };
  }
  return { placeId: place.id, placeName: place.name };
}

function getPrimaryRouteId(item: PlanItem): RouteId | null {
  if (item.routeIds && item.routeIds.length > 0) {
    return item.routeIds[0];
  }
  return null;
}

function validateScenario(scenario: Scenario, planVersionId: PlanVersionId, source: EntityState): void {
  const delayMinutes = scenario.variables['delayMinutes'];
  if (delayMinutes !== undefined) {
    if (typeof delayMinutes !== 'number' || !Number.isFinite(delayMinutes) || delayMinutes < 0) {
      throw new Error('Invalid delayMinutes in scenario');
    }
  }

  if (scenario.planVersionId !== planVersionId) {
    throw new Error('Scenario planVersionId does not match session planVersionId');
  }

  for (const sel of scenario.optionSelections) {
    const group = source.optionGroups.find(g => g.id === sel.optionGroupId);
    if (!group) {
      throw new Error(`Invalid optionGroupId: ${sel.optionGroupId}`);
    }
    if (group.planVersionId !== planVersionId) {
      throw new Error(`OptionGroup ${sel.optionGroupId} does not match planVersionId`);
    }
    if (!group.optionIds.includes(sel.optionId)) {
      throw new Error(`Invalid optionId: ${sel.optionId} for group ${sel.optionGroupId}`);
    }
  }
}

function projectItems(session: SimulationSession): ProjectedItem[] {
  const { source, planVersionId, scenario } = session;
  
  const selections = scenario?.optionSelections ?? [];
  
  const projectedState: EntityState = {
    ...source,
    optionGroups: source.optionGroups.map(g => {
      const sel = selections.find(s => s.optionGroupId === g.id);
      if (sel) {
        return { ...g, selectedOptionId: sel.optionId };
      }
      return g;
    })
  };

  const activeState = deriveActiveState(projectedState);
  const items = activeState.planItems.filter(i => i.planVersionId === planVersionId);
  
  let delayMs = 0;
  if (scenario) {
    const delayMinutes = scenario.variables['delayMinutes'];
    if (typeof delayMinutes === 'number' && Number.isFinite(delayMinutes) && delayMinutes >= 0) {
      delayMs = delayMinutes * 60 * 1000;
    }
  }

  const projected: ProjectedItem[] = [];

  for (const item of items) {
    const { startMs, endMs, allDay } = getScheduleMs(item);
    
    if (startMs === null) {
      continue;
    }

    // Handle start-only items as point events
    const effectiveEndMs = endMs !== null ? endMs : startMs + 1;

    const projStart = startMs + delayMs;
    const projEnd = effectiveEndMs + delayMs;

    const { placeId, placeName } = getPrimaryPlace(item, activeState.places);
    const routeId = getPrimaryRouteId(item);

    projected.push({
      id: item.id,
      title: item.title,
      startMs: projStart,
      endMs: projEnd,
      allDay,
      placeId,
      placeName,
      routeId
    });
  }

  projected.sort((a, b) => a.startMs - b.startMs);

  return projected;
}

function findCurrentAndNext(projected: ProjectedItem[], clockMs: number): { current: ProjectedItem | null; next: ProjectedItem | null } {
  let current: ProjectedItem | null = null;
  let next: ProjectedItem | null = null;

  const activeItems = projected.filter(p => p.startMs <= clockMs && clockMs < p.endMs);
  
  if (activeItems.length > 0) {
    const allDayItems = activeItems.filter(p => p.allDay);
    const preciseItems = activeItems.filter(p => !p.allDay);

    if (preciseItems.length > 0) {
      current = preciseItems.reduce((prev, curr) => curr.startMs > prev.startMs ? curr : prev);
    } else if (allDayItems.length > 0) {
      current = allDayItems[0];
    }
  }

  const futureItems = projected.filter(p => p.startMs > clockMs);
  if (futureItems.length > 0) {
    next = futureItems[0];
  }

  return { current, next };
}

function generateWarnings(session: SimulationSession, projected: ProjectedItem[]): SimulationWarning[] {
  const warnings: SimulationWarning[] = [];
  const { source, planVersionId, scenario } = session;
  
  if (scenario) {
    const delayMinutes = scenario.variables['delayMinutes'];
    if (typeof delayMinutes === 'number' && Number.isFinite(delayMinutes) && delayMinutes > 0) {
      const constraints = source.constraints.filter(c => c.planVersionId === planVersionId && c.type === 'fixedTime');
      for (const constraint of constraints) {
        const item = projected.find(p => p.id === constraint.subjectId);
        if (item) {
          const originalItem = source.planItems.find(i => i.id === constraint.subjectId);
          if (originalItem && originalItem.schedule.start) {
            const originalStartMs = parseIsoToMs(originalItem.schedule.start);
            const projectedStartMs = item.startMs;
            if (originalStartMs !== projectedStartMs) {
              warnings.push({
                type: 'fixedTime',
                itemId: item.id,
                message: `Item "${item.title}" has a fixed time constraint but is delayed by ${delayMinutes} minutes.`
              });
            }
          }
        }
      }
    }
  }

  for (const item of projected) {
    if (item.routeId) {
      const route = source.routes.find(r => r.id === item.routeId && r.planVersionId === planVersionId);
      if (!route) {
        warnings.push({
          type: 'routeMissing',
          itemId: item.id,
          message: `Referenced route "${item.routeId}" for item "${item.title}" is missing.`
        });
      } else {
        if (route.plannedDurationMinutes === undefined || route.plannedDurationMinutes <= 0) {
          warnings.push({
            type: 'routeUnusable',
            itemId: item.id,
            message: `Route "${route.id}" for item "${item.title}" has no usable duration.`
          });
        }
      }
    }
  }

  return warnings;
}

export function createInitialState(config: SimulationConfig): SimulationSession {
  const { entityState, planVersionId, scenario, seed, initialClockMs, initialSpeed } = config;

  if (!Number.isFinite(seed)) {
    throw new Error('Seed must be a finite number');
  }

  if (scenario) {
    validateScenario(scenario, planVersionId, entityState);
  }

  const items = entityState.planItems.filter(i => i.planVersionId === planVersionId);
  if (items.length === 0) {
    throw new Error('No scheduled items found for plan version');
  }

  let bounds = computeBounds(items);

  // Extend end bound for delay scenarios
  if (scenario) {
    const delayMinutes = scenario.variables['delayMinutes'];
    if (typeof delayMinutes === 'number' && Number.isFinite(delayMinutes) && delayMinutes >= 0) {
      bounds = { ...bounds, endMs: bounds.endMs + delayMinutes * 60000 };
    }
  }

  let clockMs = initialClockMs ?? bounds.startMs;
  if (clockMs < bounds.startMs) clockMs = bounds.startMs;
  if (clockMs > bounds.endMs) clockMs = bounds.endMs;

  let speed = initialSpeed ?? 1;
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error('Speed must be a finite positive number');
  }

  return {
    source: entityState,
    planVersionId,
    scenario: scenario ?? null,
    seed,
    clockMs,
    playing: false,
    speed,
    bounds
  };
}

export function tick(session: SimulationSession, elapsedRealMs: number): SimulationSession {
  if (!session.playing) {
    return session;
  }

  if (!Number.isFinite(elapsedRealMs) || elapsedRealMs < 0) {
    return session;
  }

  const deltaMs = elapsedRealMs * session.speed;
  let newClockMs = session.clockMs + deltaMs;

  if (newClockMs >= session.bounds.endMs) {
    newClockMs = session.bounds.endMs;
    return {
      ...session,
      clockMs: newClockMs,
      playing: false
    };
  }

  return {
    ...session,
    clockMs: newClockMs
  };
}

export function play(session: SimulationSession): SimulationSession {
  return {
    ...session,
    playing: true
  };
}

export function pause(session: SimulationSession): SimulationSession {
  return {
    ...session,
    playing: false
  };
}

export function setSpeed(session: SimulationSession, speed: number): SimulationSession {
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error('Speed must be a finite positive number');
  }
  return {
    ...session,
    speed
  };
}

export function scrub(session: SimulationSession, timeMs: number): SimulationSession {
  if (!Number.isFinite(timeMs)) {
    throw new Error('Time must be a finite number');
  }
  let newClockMs = timeMs;
  if (newClockMs < session.bounds.startMs) newClockMs = session.bounds.startMs;
  if (newClockMs > session.bounds.endMs) newClockMs = session.bounds.endMs;

  return {
    ...session,
    clockMs: newClockMs
  };
}

export function applyScenario(session: SimulationSession, scenario: Scenario | null): SimulationSession {
  if (scenario) {
    validateScenario(scenario, session.planVersionId, session.source);
  }

  // Recompute bounds based on new scenario
  const items = session.source.planItems.filter(i => i.planVersionId === session.planVersionId);
  let bounds = computeBounds(items);

  if (scenario) {
    const delayMinutes = scenario.variables['delayMinutes'];
    if (typeof delayMinutes === 'number' && Number.isFinite(delayMinutes) && delayMinutes >= 0) {
      bounds = { ...bounds, endMs: bounds.endMs + delayMinutes * 60000 };
    }
  }

  // Clamp clock into new bounds
  let clockMs = session.clockMs;
  if (clockMs < bounds.startMs) clockMs = bounds.startMs;
  if (clockMs > bounds.endMs) clockMs = bounds.endMs;

  // Stop playback if now at end
  let playing = session.playing;
  if (clockMs >= bounds.endMs) {
    playing = false;
  }

  return {
    ...session,
    scenario,
    bounds,
    clockMs,
    playing
  };
}

export function projectOptions(session: SimulationSession, optionalSelections?: { optionGroupId: OptionGroupId; optionId: PlanOptionId }[]): ActiveState {
  const selections = optionalSelections ?? session.scenario?.optionSelections ?? [];

  // Validate optional selections
  for (const sel of selections) {
    const group = session.source.optionGroups.find(g => g.id === sel.optionGroupId);
    if (!group) {
      throw new Error(`Invalid optionGroupId: ${sel.optionGroupId}`);
    }
    if (group.planVersionId !== session.planVersionId) {
      throw new Error(`OptionGroup ${sel.optionGroupId} does not match planVersionId`);
    }
    if (!group.optionIds.includes(sel.optionId)) {
      throw new Error(`Invalid optionId: ${sel.optionId} for group ${sel.optionGroupId}`);
    }
  }

  const projectedState: EntityState = {
    ...session.source,
    optionGroups: session.source.optionGroups.map(g => {
      const sel = selections.find(s => s.optionGroupId === g.id);
      if (sel) {
        return { ...g, selectedOptionId: sel.optionId };
      }
      return g;
    })
  };

  return deriveActiveState(projectedState);
}

export function getSnapshot(session: SimulationSession): SimulationSnapshot {
  const projected = projectItems(session);
  const { current, next } = findCurrentAndNext(projected, session.clockMs);
  const warnings = generateWarnings(session, projected);

  return {
    clockMs: session.clockMs,
    bounds: session.bounds,
    playing: session.playing,
    speed: session.speed,
    current,
    next,
    warnings
  };
}