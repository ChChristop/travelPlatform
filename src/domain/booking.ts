import type { BookingId, PlanItemId, CostRecordId, AttachmentId, ProjectId, ISODateTime } from './ids';

export type BookingType =
  | 'hotel'
  | 'restaurant'
  | 'flight'
  | 'ticket'
  | 'transport'
  | 'tour'
  | 'other';

export type BookingStatus =
  | 'draft'
  | 'requested'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'failed';

export interface Booking {
  id: BookingId;
  projectId: ProjectId;
  planItemIds: PlanItemId[];
  type: BookingType;
  status: BookingStatus;
  provider?: string;
  datetime?: ISODateTime;
  partySize?: number;
  confirmationCode?: string;
  bookingUrl?: string;
  bookedAt?: ISODateTime;
  cancellationDeadline?: ISODateTime;
  costRecordIds?: CostRecordId[];
  attachmentIds?: AttachmentId[];
}
