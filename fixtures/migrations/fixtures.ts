import type { LegacyEvent, LegacyTodo } from '../../src/domain/migrations/migrate.ts';

export const validEvent: LegacyEvent = {
  id: 'test-event-1',
  start: '2026-09-26T10:00:00+09:00',
  end: '2026-09-26T11:00:00+09:00',
  title: 'Test Event',
  city: 'Osaka',
  type: 'sight',
  status: 'planned',
  note: 'Test note',
  prep: '',
  prepMinutes: 0,
  lat: 34.6751,
  lng: 135.5004,
};

export const eventNoCoords: LegacyEvent = {
  id: 'test-no-coords',
  start: '2026-09-26T12:00:00+09:00',
  end: '2026-09-26T13:00:00+09:00',
  title: 'No Coords Event',
  city: 'Kyoto',
  type: 'food',
  status: 'planned',
  note: '',
  prep: '',
  prepMinutes: 0,
};

export const lodgingEvent: LegacyEvent = {
  id: 'test-lodging',
  start: '2026-09-26T21:00:00+09:00',
  end: '2026-09-28T10:00:00+09:00',
  title: 'Hotel Check-in',
  city: 'Osaka',
  type: 'hotel',
  status: 'planned',
  note: 'Multi-day stay',
  prep: '',
  prepMinutes: 0,
  lat: 34.6751,
  lng: 135.5004,
};

export const confirmedBookingEvent: LegacyEvent = {
  id: 'test-confirmed',
  start: '2026-09-27T18:00:00+09:00',
  end: '2026-09-27T20:00:00+09:00',
  title: 'Confirmed Restaurant',
  city: 'Osaka',
  type: 'food',
  status: 'planned',
  note: '',
  prep: '',
  prepMinutes: 0,
  lat: 34.6751,
  lng: 135.5004,
  reservation: '예약 확정',
};

export const ambiguousBookingEvent: LegacyEvent = {
  id: 'test-ambiguous',
  start: '2026-09-27T19:00:00+09:00',
  end: '2026-09-27T21:00:00+09:00',
  title: 'Ambiguous Restaurant',
  city: 'Osaka',
  type: 'food',
  status: 'planned',
  note: '',
  prep: '',
  prepMinutes: 0,
  lat: 34.6751,
  lng: 135.5004,
  reservation: '예약 추천',
};

export const invalidEvent: LegacyEvent = {
  id: '',
  start: '2026-09-26T10:00:00+09:00',
  end: '2026-09-26T11:00:00+09:00',
  title: 'Invalid',
  city: 'Osaka',
  type: 'sight',
  status: 'planned',
  note: '',
  prep: '',
  prepMinutes: 0,
};

export const validTodo: LegacyTodo = {
  id: 'test-todo-1',
  label: 'Test Todo',
  date: '2026-09-26',
  priority: 1,
};

export const invalidTodo: LegacyTodo = {
  id: '',
  label: 'Invalid Todo',
  date: '2026-09-26',
  priority: 1,
};
