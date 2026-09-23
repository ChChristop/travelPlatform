import type { EntityState } from '../entities/state';
import type { PlanItem } from '../../domain/plan';

export interface DayBucket {
  day: string;
  items: PlanItem[];
}

function toLocalDateParts(
  iso: string,
  timezone: string
): { year: number; month: number; day: number } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  let year = 0;
  let month = 0;
  let day = 0;

  for (const part of parts) {
    if (part.type === 'year') {
      year = Number(part.value);
    } else if (part.type === 'month') {
      month = Number(part.value);
    } else if (part.type === 'day') {
      day = Number(part.value);
    }
  }

  if (year === 0 || month === 0 || day === 0) {
    return null;
  }

  return { year, month, day };
}

function formatDayKey(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function addDaysToKey(key: string, days: number): string {
  const [yearStr, monthStr, dayStr] = key.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  return formatDayKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
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

export function selectByDay(state: EntityState, timezone: string): DayBucket[] {
  const buckets = new Map<string, PlanItem[]>();

  for (const item of state.planItems) {
    const start = item.schedule.start;

    if (start === undefined) {
      const existing = buckets.get('unscheduled') ?? [];
      existing.push(item);
      buckets.set('unscheduled', existing);
      continue;
    }

    const startParts = toLocalDateParts(start, timezone);
    if (startParts === null) {
      const existing = buckets.get('unscheduled') ?? [];
      existing.push(item);
      buckets.set('unscheduled', existing);
      continue;
    }

    const startKey = formatDayKey(startParts.year, startParts.month, startParts.day);

    const end = item.schedule.end;
    let endKey: string | null = null;
    if (end !== undefined) {
      const endParts = toLocalDateParts(end, timezone);
      if (endParts !== null) {
        endKey = formatDayKey(endParts.year, endParts.month, endParts.day);
      }
    }

    if (endKey === null || endKey === startKey) {
      const existing = buckets.get(startKey) ?? [];
      existing.push(item);
      buckets.set(startKey, existing);
    } else {
      let current = startKey;
      while (current <= endKey) {
        const existing = buckets.get(current) ?? [];
        existing.push(item);
        buckets.set(current, existing);
        current = addDaysToKey(current, 1);
      }
    }
  }

  const result: DayBucket[] = [];
  for (const [day, items] of buckets) {
    const sortedItems = [...items].sort(compareStart);
    result.push({ day, items: sortedItems });
  }

  result.sort((a, b) => {
    if (a.day === 'unscheduled' && b.day === 'unscheduled') {
      return 0;
    }
    if (a.day === 'unscheduled') {
      return 1;
    }
    if (b.day === 'unscheduled') {
      return -1;
    }
    return a.day.localeCompare(b.day);
  });

  return result;
}
