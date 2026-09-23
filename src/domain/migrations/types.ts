export interface ProvenanceEntry {
  legacyId: string;
  legacyKind: 'event' | 'todo';
  newIds: string[];
  action: 'kept' | 'merged' | 'split' | 'dropped';
  note: string;
}

export interface UnresolvedItem {
  legacyId: string;
  legacyKind: 'event' | 'todo';
  reason: string;
  rawData: unknown;
}

export interface MigrationReport {
  generatedAt: string;
  inputHash: string;
  totalLegacyEvents: number;
  totalLegacyTodos: number;
  dayProjections: string[];
  coordinateBearingCount: number;
  missingCoordinateIds: string[];
  provenance: ProvenanceEntry[];
  unresolved: UnresolvedItem[];
}

import type { Workspace } from '../workspace';
import type { TravelProject } from '../project';
import type { PlanVersion, PlanItem } from '../plan';
import type { Place } from '../place';
import type { Task } from '../task';
import type { Booking } from '../booking';

export interface MigrationSeed {
  workspace: Workspace;
  project: TravelProject;
  planVersion: PlanVersion;
  places: Place[];
  planItems: PlanItem[];
  tasks: Task[];
  bookings: Booking[];
}

export interface MigrationResult {
  planVersionId: string;
  idMap: Record<string, string>;
  seed: MigrationSeed;
  report: MigrationReport;
}
