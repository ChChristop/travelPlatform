import type { TaskId, ProjectId, PlanItemId, PlaceId, ISODateTime } from './ids';

export type TaskStatus = 'todo' | 'done' | 'skipped';

export type Trigger =
  | { type: 'absoluteTime'; at: ISODateTime }
  | { type: 'beforePlanItem'; planItemId: PlanItemId; minutes: number }
  | { type: 'afterPlanItem'; planItemId: PlanItemId }
  | { type: 'enterPlace'; placeId: PlaceId; radiusMeters: number };

export interface Task {
  id: TaskId;
  projectId: ProjectId;
  title: string;
  linkedPlanItemId?: PlanItemId;
  status: TaskStatus;
  trigger?: Trigger;
}
