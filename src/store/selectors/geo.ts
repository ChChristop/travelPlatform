import type { EntityState } from '../entities/state';
import type { PlanItem } from '../../domain/plan';

export interface CityBucket {
  city: string;
  items: PlanItem[];
}

function resolveCity(state: EntityState, item: PlanItem): string {
  const firstRef = item.places[0];
  if (firstRef === undefined) {
    return 'unknown';
  }

  const place = state.places.find((p) => p.id === firstRef.placeId);
  if (place === undefined) {
    return 'unknown';
  }

  const city = place.region?.city;
  if (city === undefined || city === '') {
    return 'unknown';
  }

  return city;
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

export function selectByCity(state: EntityState): CityBucket[] {
  const buckets = new Map<string, PlanItem[]>();

  for (const item of state.planItems) {
    const city = resolveCity(state, item);
    const existing = buckets.get(city) ?? [];
    existing.push(item);
    buckets.set(city, existing);
  }

  const result: CityBucket[] = [];
  for (const [city, items] of buckets) {
    const sortedItems = [...items].sort(compareStart);
    result.push({ city, items: sortedItems });
  }

  result.sort((a, b) => {
    if (a.city === 'unknown' && b.city === 'unknown') {
      return 0;
    }
    if (a.city === 'unknown') {
      return 1;
    }
    if (b.city === 'unknown') {
      return -1;
    }
    return a.city.localeCompare(b.city);
  });

  return result;
}
