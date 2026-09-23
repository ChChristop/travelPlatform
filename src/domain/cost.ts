import type { CostRecordId, PlanItemId, BookingId, RouteId, ProjectId, ISODate } from './ids';
import type { Money, PaymentInfo } from './money';

export type CostRecordType = 'estimate' | 'committed' | 'actual' | 'refund';

export type CostCategory =
  | 'lodging'
  | 'food'
  | 'transport'
  | 'attraction'
  | 'shopping'
  | 'other';

export type CostSubjectType = 'planItem' | 'booking' | 'route' | 'project';

export type CostSubject =
  | { type: 'planItem'; id: PlanItemId }
  | { type: 'booking'; id: BookingId }
  | { type: 'route'; id: RouteId }
  | { type: 'project'; id: ProjectId };

export type CostBreakdownType = 'night' | 'person' | 'fee' | 'tax' | 'discount' | 'custom';

export interface CostBreakdown {
  type: CostBreakdownType;
  date?: ISODate;
  label?: string;
  amount: Money;
}

export interface CostRecord {
  id: CostRecordId;
  projectId: ProjectId;
  subject: CostSubject;
  type: CostRecordType;
  category: CostCategory;
  total: Money;
  breakdown?: CostBreakdown[];
  servicePeriod?: {
    start: ISODate;
    end?: ISODate;
  };
  payment?: PaymentInfo;
}
