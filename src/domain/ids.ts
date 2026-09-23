export type EntityId<K extends string> = string & { readonly __entity: K };

export type WorkspaceId = EntityId<'Workspace'>;
export type UserId = EntityId<'User'>;
export type ProjectId = EntityId<'Project'>;
export type PlanVersionId = EntityId<'PlanVersion'>;
export type PlanItemId = EntityId<'PlanItem'>;
export type PlaceId = EntityId<'Place'>;
export type BookingId = EntityId<'Booking'>;
export type CostRecordId = EntityId<'CostRecord'>;
export type RouteId = EntityId<'Route'>;
export type TaskId = EntityId<'Task'>;
export type PlanFragmentId = EntityId<'PlanFragment'>;
export type PlanOptionId = EntityId<'PlanOption'>;
export type OptionGroupId = EntityId<'OptionGroup'>;
export type ScenarioId = EntityId<'Scenario'>;
export type ConstraintId = EntityId<'Constraint'>;
export type TripRunId = EntityId<'TripRun'>;
export type ItemExecutionId = EntityId<'ItemExecution'>;
export type AttachmentId = EntityId<'Attachment'>;
export type TemplateId = EntityId<'Template'>;
export type CollectionId = EntityId<'Collection'>;
export type PaymentMethodId = EntityId<'PaymentMethod'>;

export type ISODate = string;
export type ISODateTime = string;