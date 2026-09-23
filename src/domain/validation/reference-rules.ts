import type { ValidationError } from './errors';
import type { PlanItem, PlanVersion } from '../plan';
import type { Place, PlaceReference } from '../place';
import type { CostRecord } from '../cost';

export interface ReferenceEntities {
  places: Place[];
  planVersions: PlanVersion[];
  planItems: PlanItem[];
  costRecords: CostRecord[];
}

function checkDuplicateIds<T extends { id: string }>(
  entities: T[],
  entityType: string,
  errors: ValidationError[]
): void {
  const seen = new Set<string>();
  for (const entity of entities) {
    if (seen.has(entity.id)) {
      errors.push({
        code: 'duplicate-id',
        entityType,
        entityId: entity.id,
        message: `Duplicate ${entityType} id: ${entity.id}`
      });
    } else {
      seen.add(entity.id);
    }
  }
}

function checkPlaceReferences(
  planItems: PlanItem[],
  places: Place[],
  errors: ValidationError[]
): void {
  const placeIds = new Set(places.map((p) => p.id));
  for (const item of planItems) {
    for (const ref of item.places) {
      if (!placeIds.has(ref.placeId)) {
        errors.push({
          code: 'dangling-reference',
          entityType: 'PlanItem',
          entityId: item.id,
          message: `PlanItem ${item.id} references non-existent Place ${ref.placeId}`
        });
      }
    }
  }
}

function checkCostRecordSubjects(
  costRecords: CostRecord[],
  planItems: PlanItem[],
  errors: ValidationError[]
): void {
  const planItemIds = new Set(planItems.map((i) => i.id));
  for (const record of costRecords) {
    if (record.subject.type === 'planItem') {
      if (!planItemIds.has(record.subject.id)) {
        errors.push({
          code: 'dangling-reference',
          entityType: 'CostRecord',
          entityId: record.id,
          message: `CostRecord ${record.id} references non-existent PlanItem ${record.subject.id}`
        });
      }
    }
  }
}

function checkPlanItemReferences(
  planItems: PlanItem[],
  planVersions: PlanVersion[],
  errors: ValidationError[]
): void {
  const planVersionIds = new Set(planVersions.map((v) => v.id));
  for (const item of planItems) {
    if (!planVersionIds.has(item.planVersionId)) {
      errors.push({
        code: 'dangling-reference',
        entityType: 'PlanItem',
        entityId: item.id,
        message: `PlanItem ${item.id} references non-existent PlanVersion ${item.planVersionId}`
      });
    }
  }
}

function checkOwnership(
  costRecords: CostRecord[],
  planItems: PlanItem[],
  planVersions: PlanVersion[],
  errors: ValidationError[]
): void {
  const planItemById = new Map(planItems.map((i) => [i.id, i]));
  const planVersionById = new Map(planVersions.map((v) => [v.id, v]));

  for (const record of costRecords) {
    if (record.subject.type !== 'planItem') {
      continue;
    }

    const planItem = planItemById.get(record.subject.id);
    if (!planItem) {
      continue;
    }

    const planVersion = planVersionById.get(planItem.planVersionId);
    if (!planVersion) {
      continue;
    }

    if (planVersion.projectId !== record.projectId) {
      errors.push({
        code: 'ownership-mismatch',
        entityType: 'CostRecord',
        entityId: record.id,
        message: `CostRecord ${record.id} has projectId ${record.projectId} but PlanItem ${planItem.id} belongs to PlanVersion ${planVersion.id} with projectId ${planVersion.projectId}`
      });
    }
  }
}

export function validateReferenceRules(entities: ReferenceEntities): ValidationError[] {
  const errors: ValidationError[] = [];

  checkDuplicateIds(entities.places, 'Place', errors);
  checkDuplicateIds(entities.planVersions, 'PlanVersion', errors);
  checkDuplicateIds(entities.planItems, 'PlanItem', errors);
  checkDuplicateIds(entities.costRecords, 'CostRecord', errors);

  checkPlaceReferences(entities.planItems, entities.places, errors);
  checkCostRecordSubjects(entities.costRecords, entities.planItems, errors);
  checkPlanItemReferences(entities.planItems, entities.planVersions, errors);
  checkOwnership(entities.costRecords, entities.planItems, entities.planVersions, errors);

  return errors;
}
