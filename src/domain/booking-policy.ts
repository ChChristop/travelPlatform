export interface BookingPolicy {
  availability: 'available' | 'notAvailable' | 'unknown';
  requirement: 'required' | 'recommended' | 'optional' | 'walkInOnly';
  note?: string;
}