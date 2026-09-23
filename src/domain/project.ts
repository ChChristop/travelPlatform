import type { ISODate, PlanVersionId, ProjectId, WorkspaceId } from './ids';

export interface TravelProject {
  id: ProjectId;
  workspaceId: WorkspaceId;
  title: string;
  description?: string;
  startDate?: ISODate;
  endDate?: ISODate;
  timezone: string;
  status: 'research' | 'planning' | 'ready' | 'active' | 'completed' | 'archived';
  visibility: 'private' | 'link' | 'public';
  activePlanVersionId?: PlanVersionId;
  source?: {
    type: 'original' | 'fork' | 'template';
    projectId?: ProjectId;
    planVersionId?: PlanVersionId;
  };
}