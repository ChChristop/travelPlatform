import type { Booking, BookingStatus, BookingType } from '../../domain/booking';
import type { BookingId, ProjectId, PlanItemId, CostRecordId, AttachmentId, ISODateTime } from '../../domain/ids';
import type { EntityState } from '../entities/state';

export interface BookingInput {
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

export type CommandResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function createBooking(input: BookingInput): CommandResult<Booking> {
  if (!input.id || typeof input.id !== 'string') {
    return { ok: false, error: 'Booking id is required' };
  }
  if (!input.projectId || typeof input.projectId !== 'string') {
    return { ok: false, error: 'Booking projectId is required' };
  }
  if (!Array.isArray(input.planItemIds)) {
    return { ok: false, error: 'Booking planItemIds must be an array' };
  }
  const validTypes: BookingType[] = ['hotel', 'restaurant', 'flight', 'ticket', 'transport', 'tour', 'other'];
  if (!validTypes.includes(input.type)) {
    return { ok: false, error: `Invalid Booking type: ${input.type}` };
  }
  const validStatuses: BookingStatus[] = ['draft', 'requested', 'confirmed', 'cancelled', 'completed', 'failed'];
  if (!validStatuses.includes(input.status)) {
    return { ok: false, error: `Invalid Booking status: ${input.status}` };
  }

  const booking: Booking = {
    id: input.id,
    projectId: input.projectId,
    planItemIds: input.planItemIds,
    type: input.type,
    status: input.status,
  };
  if (input.provider !== undefined) booking.provider = input.provider;
  if (input.datetime !== undefined) booking.datetime = input.datetime;
  if (input.partySize !== undefined) booking.partySize = input.partySize;
  if (input.confirmationCode !== undefined) booking.confirmationCode = input.confirmationCode;
  if (input.bookingUrl !== undefined) booking.bookingUrl = input.bookingUrl;
  if (input.bookedAt !== undefined) booking.bookedAt = input.bookedAt;
  if (input.cancellationDeadline !== undefined) booking.cancellationDeadline = input.cancellationDeadline;
  if (input.costRecordIds !== undefined) booking.costRecordIds = input.costRecordIds;
  if (input.attachmentIds !== undefined) booking.attachmentIds = input.attachmentIds;

  return { ok: true, value: booking };
}

export function updateBookingStatus(
  state: EntityState,
  bookingId: BookingId,
  status: BookingStatus
): CommandResult<EntityState> {
  const validStatuses: BookingStatus[] = ['draft', 'requested', 'confirmed', 'cancelled', 'completed', 'failed'];
  if (!validStatuses.includes(status)) {
    return { ok: false, error: `Invalid Booking status: ${status}` };
  }
  const booking = state.bookings.find((b) => b.id === bookingId);
  if (!booking) {
    return { ok: false, error: `Booking ${bookingId} not found` };
  }
  const updatedBookings = state.bookings.map((b) => (b.id === bookingId ? { ...b, status } : b));
  return {
    ok: true,
    value: {
      ...state,
      bookings: updatedBookings,
    },
  };
}
