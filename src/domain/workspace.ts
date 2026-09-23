import type { CollectionId, ProjectId, TemplateId, UserId, WorkspaceId } from './ids';

export interface Workspace {
  id: WorkspaceId;
  ownerId: UserId;
  projectIds: ProjectId[];
  templateIds: TemplateId[];
  collectionIds: CollectionId[];
}