import type { ProvenanceEntry, UnresolvedItem, MigrationReport, MigrationResult, MigrationSeed } from './types.ts';
import type { PlanItem, PlanItemType, PlanItemDetail } from '../plan.ts';
import type { Place, PlaceReference } from '../place.ts';
import type { Task } from '../task.ts';
import type { Booking, BookingType } from '../booking.ts';
import type { Workspace } from '../workspace.ts';
import type { TravelProject } from '../project.ts';
import type { PlanVersion } from '../plan.ts';
import type { BookingPolicy } from '../booking-policy.ts';
import type {
  WorkspaceId,
  UserId,
  ProjectId,
  PlanVersionId,
  PlanItemId,
  PlaceId,
  BookingId,
  TaskId,
  ISODate,
  ISODateTime,
} from '../ids.ts';

export interface LegacyEvent {
  id: string;
  start: string;
  end: string;
  title: string;
  city: string;
  type: string;
  status: string;
  note: string;
  prep: string;
  prepMinutes: number;
  lat?: number;
  lng?: number;
  query?: string;
  price?: string;
  reservation?: string;
  transport?: string;
}

export interface LegacyTodo {
  id: string;
  label: string;
  date: string;
  priority: number;
}

export interface MigrationInput {
  events: LegacyEvent[];
  todos: LegacyTodo[];
}

const TYPE_MAP: Record<string, PlanItemType> = {
  flight: 'flight',
  arrival: 'transport',
  transit: 'transport',
  food: 'meal',
  sight: 'attraction',
  hotel: 'lodging',
  event: 'event',
  task: 'task',
  flex: 'freeTime',
};

function hashString(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function computeInputHash(events: LegacyEvent[], todos: LegacyTodo[]): string {
  const eStr = JSON.stringify(events.map(e => ({ id: e.id, start: e.start, end: e.end, title: e.title, city: e.city, type: e.type, status: e.status, note: e.note, prep: e.prep, prepMinutes: e.prepMinutes, lat: e.lat, lng: e.lng, query: e.query, price: e.price, reservation: e.reservation, transport: e.transport })));
  const tStr = JSON.stringify(todos.map(t => ({ id: t.id, label: t.label, date: t.date, priority: t.priority })));
  return hashString(eStr + tStr);
}

function getDayKey(iso: string): string {
  if (!iso || typeof iso !== 'string') return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).split('-');
  return parts.join('-');
}

function hasValidCoords(e: LegacyEvent): boolean {
  return Number.isFinite(e.lat) && Number.isFinite(e.lng);
}

function isConfirmedReservation(res: string | undefined): boolean {
  if (!res) return false;
  return res.includes('확정') || res.includes('confirmed');
}

function isAmbiguousReservation(res: string | undefined): boolean {
  if (!res) return false;
  if (isConfirmedReservation(res)) return false;
  return res.includes('예약') || res.includes('전화') || res.includes('미예약');
}

function makeDetail(type: PlanItemType): PlanItemDetail {
  switch (type) {
    case 'lodging': return { type: 'lodging' };
    case 'meal': return { type: 'meal' };
    case 'transport': return { type: 'transport' };
    case 'attraction': return { type: 'attraction' };
    case 'shopping': return { type: 'shopping' };
    case 'flight': return { type: 'flight' };
    case 'event': return { type: 'event' };
    case 'freeTime': return { type: 'freeTime' };
    case 'task': return { type: 'task' };
    case 'custom': return { type: 'custom' };
  }
}

function bookingTypeForEvent(e: LegacyEvent): BookingType | null {
  if (e.type === 'hotel') return 'hotel';
  if (e.type === 'food') return 'restaurant';
  if (e.type === 'flight') return 'flight';
  return null;
}

function buildPlanItem(
  type: PlanItemType,
  id: PlanItemId,
  planVersionId: PlanVersionId,
  title: string,
  start: ISODateTime,
  end: ISODateTime,
  places: PlaceReference[],
  description: string | undefined,
  bookingPolicy: BookingPolicy | undefined
): PlanItem {
  const base = {
    id,
    planVersionId,
    title,
    schedule: { start, end },
    places,
    status: 'planned' as const,
  };
  const withDesc = description !== undefined ? { ...base, description } : base;
  const withPolicy = bookingPolicy !== undefined ? { ...withDesc, bookingPolicy } : withDesc;
  return { ...withPolicy, type, detail: makeDetail(type) } as PlanItem;
}

export function migrate(input: MigrationInput): MigrationResult {
  const { events, todos } = input;

  const provenance: ProvenanceEntry[] = [];
  const unresolved: UnresolvedItem[] = [];
  const idMap: Record<string, string> = {};

  const daySet = new Set<string>();
  let coordinateBearingCount = 0;
  const missingCoordinateIds: string[] = [];

  const workspaceId = 'workspace:kansai-2026' as WorkspaceId;
  const ownerId = 'user:migration' as UserId;
  const projectId = 'project:kansai-2026' as ProjectId;
  const planVersionId = 'plan-version:kansai-2026' as PlanVersionId;

  const places: Place[] = [];
  const placeByCoord = new Map<string, PlaceId>();
  const planItems: PlanItem[] = [];
  const tasks: Task[] = [];
  const bookings: Booking[] = [];

  for (const e of events) {
    if (!e || typeof e !== 'object' || !e.id || typeof e.id !== 'string') {
      unresolved.push({
        legacyId: e?.id || 'unknown',
        legacyKind: 'event',
        reason: 'Invalid event structure: missing or invalid id',
        rawData: e
      });
      continue;
    }

    const legacyId = e.id;
    const newId = `plan-item:${legacyId}` as PlanItemId;
    idMap[legacyId] = newId;

    const dayKey = getDayKey(e.start);
    if (dayKey) daySet.add(dayKey);

    let placeId: PlaceId | null = null;
    if (hasValidCoords(e)) {
      coordinateBearingCount++;
      const latR = Math.round((e.lat as number) * 100000) / 100000;
      const lngR = Math.round((e.lng as number) * 100000) / 100000;
      const coordKey = `${latR},${lngR}`;
      const existing = placeByCoord.get(coordKey);
      if (existing) {
        placeId = existing;
      } else {
        const pid = `place:${coordKey}` as PlaceId;
        placeByCoord.set(coordKey, pid);
        const place: Place = {
          id: pid,
          workspaceId,
          name: e.title,
          coordinates: { lat: latR, lng: lngR },
          region: { city: e.city },
        };
        places.push(place);
        placeId = pid;
      }
    } else {
      missingCoordinateIds.push(legacyId);
    }

    const mappedType = TYPE_MAP[e.type] || 'custom';
    const placesRef: PlaceReference[] = placeId ? [{ placeId: placeId, role: 'primary' }] : [];

    let bookingPolicy: BookingPolicy | undefined;
    if (e.reservation) {
      if (isConfirmedReservation(e.reservation)) {
        bookingPolicy = { availability: 'available', requirement: 'required', note: e.reservation };
      } else if (isAmbiguousReservation(e.reservation)) {
        bookingPolicy = { availability: 'unknown', requirement: 'recommended', note: e.reservation };
      }
    }

    const planItem = buildPlanItem(
      mappedType,
      newId,
      planVersionId,
      e.title,
      e.start as ISODateTime,
      e.end as ISODateTime,
      placesRef,
      e.note || undefined,
      bookingPolicy
    );
    planItems.push(planItem);

    let note = `Type mapped from '${e.type}' to '${mappedType}'.`;

    if (e.type === 'hotel') {
      note += ' Hotel check-in event represented as single lodging PlanItem with schedule period, not duplicated per day.';
    }

    const newIds: string[] = [newId];

    if (e.reservation) {
      if (isConfirmedReservation(e.reservation)) {
        const bt = bookingTypeForEvent(e);
        if (bt) {
          const bid = `booking:${legacyId}` as BookingId;
          const booking: Booking = {
            id: bid,
            projectId,
            planItemIds: [newId],
            type: bt,
            status: 'confirmed',
            datetime: e.start as ISODateTime,
          };
          bookings.push(booking);
          newIds.push(bid);
          note += ` Reservation confirmed: '${e.reservation}'. Booking created with id '${bid}'.`;
        } else {
          note += ` Reservation confirmed: '${e.reservation}'. No Booking created because BookingType could not be confidently determined.`;
        }
      } else if (isAmbiguousReservation(e.reservation)) {
        note += ` Reservation ambiguous: '${e.reservation}'. No Booking created, original text preserved in BookingPolicy.note.`;
      }
    }

    if (e.price) {
      note += ` Price preserved as text: '${e.price}'.`;
    }

    if (!hasValidCoords(e)) {
      note += ' Coordinates missing, no Place created.';
    }

    provenance.push({
      legacyId,
      legacyKind: 'event',
      newIds,
      action: 'kept',
      note
    });
  }

  for (const t of todos) {
    if (!t || typeof t !== 'object' || !t.id || typeof t.id !== 'string') {
      unresolved.push({
        legacyId: t?.id || 'unknown',
        legacyKind: 'todo',
        reason: 'Invalid todo structure: missing or invalid id',
        rawData: t
      });
      continue;
    }

    const legacyId = t.id;
    const newId = `task:${legacyId}` as TaskId;
    idMap[legacyId] = newId;

    const dayKey = getDayKey(t.date);
    if (dayKey) daySet.add(dayKey);

    const task: Task = {
      id: newId,
      projectId,
      title: t.label,
      status: 'todo',
    };
    tasks.push(task);

    provenance.push({
      legacyId,
      legacyKind: 'todo',
      newIds: [newId],
      action: 'kept',
      note: `Todo mapped to Task with id '${newId}'. Priority: ${t.priority}.`
    });
  }

  const dayProjections = Array.from(daySet).sort();

  const workspace: Workspace = {
    id: workspaceId,
    ownerId,
    projectIds: [projectId],
    templateIds: [],
    collectionIds: [],
  };

  const project: TravelProject = {
    id: projectId,
    workspaceId,
    title: 'Kansai Trip 2026',
    description: 'Migration seed for Kansai trip. Status/visibility are structural placeholders, not claims about the real project.',
    startDate: '2026-09-26' as ISODate,
    endDate: '2026-10-01' as ISODate,
    timezone: 'Asia/Tokyo',
    status: 'planning',
    visibility: 'private',
    activePlanVersionId: planVersionId,
  };

  const planVersion: PlanVersion = {
    id: planVersionId,
    projectId,
    version: 1,
    status: 'draft',
    createdAt: new Date().toISOString(),
    comment: 'Initial migration seed from legacy trip.js',
  };

  const seed: MigrationSeed = {
    workspace,
    project,
    planVersion,
    places,
    planItems,
    tasks,
    bookings,
  };

  const report: MigrationReport = {
    generatedAt: new Date().toISOString(),
    inputHash: computeInputHash(events, todos),
    totalLegacyEvents: events.length,
    totalLegacyTodos: todos.length,
    dayProjections,
    coordinateBearingCount,
    missingCoordinateIds,
    provenance,
    unresolved
  };

  return {
    planVersionId,
    idMap,
    seed,
    report
  };
}
