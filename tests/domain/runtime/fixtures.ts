import type { TravelProject } from '../../../src/domain/project';
import type { PlanVersion, PlanItem } from '../../../src/domain/plan';
import type { Place } from '../../../src/domain/place';
import type { Booking } from '../../../src/domain/booking';
import type { CostRecord } from '../../../src/domain/cost';
import type { Route } from '../../../src/domain/route';
import type { Task } from '../../../src/domain/task';
import type { PlanFragment, PlanOption, OptionGroup } from '../../../src/domain/alternatives';
import type { Scenario, Constraint } from '../../../src/domain/scenario';
import type { TripRun, ItemExecution } from '../../../src/domain/run';
import type { Money } from '../../../src/domain/money';
import type { StateFactoryInput } from '../../../src/store/entities/state';
import type {
  ProjectId,
  WorkspaceId,
  PlanVersionId,
  PlanItemId,
  PlaceId,
  CostRecordId,
  OptionGroupId,
  PlanOptionId,
  PlanFragmentId,
  TripRunId,
  ItemExecutionId
} from '../../../src/domain';

export function createValidStateInput(): StateFactoryInput {
  const project: TravelProject = {
    id: 'proj-1' as ProjectId,
    workspaceId: 'ws-1' as WorkspaceId,
    title: 'Kansai Trip',
    timezone: 'Asia/Tokyo',
    status: 'planning',
    visibility: 'private',
  };

  const planVersion: PlanVersion = {
    id: 'pv-1' as PlanVersionId,
    projectId: 'proj-1' as ProjectId,
    version: 1,
    status: 'draft',
    createdAt: '2026-09-20T10:00:00+09:00',
  };

  const place: Place = {
    id: 'place-1' as PlaceId,
    workspaceId: 'ws-1' as WorkspaceId,
    name: 'Osaka Castle',
    coordinates: { lat: 34.6851, lng: 135.5326 },
  };

  const planItem: PlanItem = {
    id: 'pi-1' as PlanItemId,
    planVersionId: 'pv-1' as PlanVersionId,
    type: 'attraction',
    title: 'Visit Osaka Castle',
    schedule: {
      start: '2026-09-26T10:00:00+09:00',
      end: '2026-09-26T12:00:00+09:00',
    },
    places: [{ placeId: 'place-1' as PlaceId, role: 'primary' }],
    detail: { type: 'attraction' },
    status: 'planned',
  };

  const costRecord: CostRecord = {
    id: 'cr-1' as CostRecordId,
    projectId: 'proj-1' as ProjectId,
    subject: { type: 'planItem', id: 'pi-1' as PlanItemId },
    type: 'estimate',
    category: 'attraction',
    total: { amount: 600, currency: 'JPY' },
  };

  const optionGroup: OptionGroup = {
    id: 'og-1' as OptionGroupId,
    planVersionId: 'pv-1' as PlanVersionId,
    title: 'Lunch Options',
    optionIds: ['opt-1' as PlanOptionId, 'opt-2' as PlanOptionId],
    selectedOptionId: 'opt-1' as PlanOptionId,
  };

  const planOption1: PlanOption = {
    id: 'opt-1' as PlanOptionId,
    planVersionId: 'pv-1' as PlanVersionId,
    label: 'Ramen',
    fragmentId: 'frag-1' as PlanFragmentId,
  };

  const planOption2: PlanOption = {
    id: 'opt-2' as PlanOptionId,
    planVersionId: 'pv-1' as PlanVersionId,
    label: 'Sushi',
    fragmentId: 'frag-1' as PlanFragmentId,
  };

  const planFragment: PlanFragment = {
    id: 'frag-1' as PlanFragmentId,
    planVersionId: 'pv-1' as PlanVersionId,
    title: 'Lunch Fragment',
    planItemIds: ['pi-1' as PlanItemId],
  };

  const tripRun: TripRun = {
    id: 'tr-1' as TripRunId,
    projectId: 'proj-1' as ProjectId,
    planVersionId: 'pv-1' as PlanVersionId,
    status: 'notStarted',
  };

  const itemExecution: ItemExecution = {
    id: 'ie-1' as ItemExecutionId,
    tripRunId: 'tr-1' as TripRunId,
    planItemId: 'pi-1' as PlanItemId,
    status: 'pending',
  };

  return {
    projects: [project],
    planVersions: [planVersion],
    planItems: [planItem],
    places: [place],
    bookings: [],
    costRecords: [costRecord],
    routes: [],
    tasks: [],
    planFragments: [planFragment],
    planOptions: [planOption1, planOption2],
    optionGroups: [optionGroup],
    scenarios: [],
    constraints: [],
    tripRuns: [tripRun],
    itemExecutions: [itemExecution],
    moneyValues: [{ amount: 600, currency: 'JPY' }],
  };
}
