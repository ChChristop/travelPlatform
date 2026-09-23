import type { EntityState } from '../entities/state';
import type { PlanItem, PlanItemType } from '../../domain/plan';

export interface TypeBucket {
  type: PlanItemType;
  items: PlanItem[];
}

function compareStart(a: PlanItem, b: PlanItem): number {
  const aStart = a.schedule.start;
  const bStart = b.schedule.start;

  if (aStart === undefined && bStart === undefined) {
    return 0;
  }
  if (aStart === undefined) {
    return 1;
  }
  if (bStart === undefined) {
    return -1;
  }

  const aTime = new Date(aStart).getTime();
  const bTime = new Date(bStart).getTime();

  if (aTime !== bTime) {
    return aTime - bTime;
  }

  return a.id.localeCompare(b.id);
}

export function selectByType(state: EntityState): TypeBucket[] {
  const buckets = new Map<PlanItemType, PlanItem[]>();

  for (const item of state.planItems) {
    const existing = buckets.get(item.type) ?? [];
    existing.push(item);
    buckets.set(item.type, existing);
  }

  const result: TypeBucket[] = [];
  for (const [type, items] of buckets) {
    const sortedItems = [...items].sort(compareStart);
    result.push({ type, items: sortedItems });
  }

  return result;
}
