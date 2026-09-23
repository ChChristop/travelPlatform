import type { EntityState } from '../store/entities/state';

export const ENVELOPE_VERSION = 1;

export interface PersistenceEnvelope {
  version: number;
  savedAt: string;
  data: EntityState;
}
