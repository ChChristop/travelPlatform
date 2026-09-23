import type { TripRunId, ItemExecutionId, ProjectId, PlanVersionId, PlanItemId, ISODateTime } from './ids';

export type TripRunStatus = 'notStarted' | 'active' | 'paused' | 'completed';

export interface TripRun {
  id: TripRunId;
  projectId: ProjectId;
  planVersionId: PlanVersionId;
  status: TripRunStatus;
  startedAt?: ISODateTime;
  completedAt?: ISODateTime;
}

export type ItemExecutionStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface ItemExecution {
  id: ItemExecutionId;
  tripRunId: TripRunId;
  planItemId: PlanItemId;
  status: ItemExecutionStatus;
  actualStart?: ISODateTime;
  actualEnd?: ISODateTime;
  note?: string;
}
