import type { ISODate, ISODateTime, PlanItemId, PlanVersionId, ProjectId, RouteId } from './ids';
import type { BookingPolicy } from './booking-policy';
import type { PlaceReference } from './place';

export type PlanItemType =
  | 'lodging'
  | 'meal'
  | 'transport'
  | 'attraction'
  | 'shopping'
  | 'flight'
  | 'event'
  | 'freeTime'
  | 'task'
  | 'custom';

export interface Schedule {
  start?: ISODateTime;
  end?: ISODateTime;
  allDay?: boolean;
  flexibility?: {
    type: 'fixed' | 'window' | 'flexible';
    earliestStart?: ISODateTime;
    latestStart?: ISODateTime;
  };
}

export interface LodgingDetail {
  type: 'lodging';
  roomType?: string;
  checkInTime?: string;
  checkOutTime?: string;
  luggageStorage?: {
    beforeCheckIn?: boolean;
    afterCheckOut?: boolean;
  };
}

export interface MealDetail {
  type: 'meal';
}

export interface TransportDetail {
  type: 'transport';
}

export interface AttractionDetail {
  type: 'attraction';
}

export interface ShoppingDetail {
  type: 'shopping';
}

export interface FlightDetail {
  type: 'flight';
}

export interface EventDetail {
  type: 'event';
}

export interface FreeTimeDetail {
  type: 'freeTime';
}

export interface TaskDetail {
  type: 'task';
}

export interface CustomDetail {
  type: 'custom';
}

export type PlanItemDetail =
  | LodgingDetail
  | MealDetail
  | TransportDetail
  | AttractionDetail
  | ShoppingDetail
  | FlightDetail
  | EventDetail
  | FreeTimeDetail
  | TaskDetail
  | CustomDetail;

interface PlanItemBase {
  id: PlanItemId;
  planVersionId: PlanVersionId;
  title: string;
  description?: string;
  schedule: Schedule;
  places: PlaceReference[];
  bookingPolicy?: BookingPolicy;
  status: 'candidate' | 'planned' | 'confirmed' | 'cancelled';
  tags?: string[];
  routeIds?: RouteId[];
}

export type PlanItem =
  | (PlanItemBase & { type: 'lodging'; detail: LodgingDetail })
  | (PlanItemBase & { type: 'meal'; detail: MealDetail })
  | (PlanItemBase & { type: 'transport'; detail: TransportDetail })
  | (PlanItemBase & { type: 'attraction'; detail: AttractionDetail })
  | (PlanItemBase & { type: 'shopping'; detail: ShoppingDetail })
  | (PlanItemBase & { type: 'flight'; detail: FlightDetail })
  | (PlanItemBase & { type: 'event'; detail: EventDetail })
  | (PlanItemBase & { type: 'freeTime'; detail: FreeTimeDetail })
  | (PlanItemBase & { type: 'task'; detail: TaskDetail })
  | (PlanItemBase & { type: 'custom'; detail: CustomDetail });

export interface PlanVersion {
  id: PlanVersionId;
  projectId: ProjectId;
  version: number;
  parentVersionId?: PlanVersionId;
  status: 'draft' | 'published' | 'archived';
  createdAt: ISODateTime;
  comment?: string;
}