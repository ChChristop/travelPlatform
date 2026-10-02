import type { CostRecord, CostRecordType, CostCategory, CostSubject, CostBreakdown } from '../../domain/cost';
import type { Money } from '../../domain/money';
import type { ProjectId, CostRecordId } from '../../domain/ids';
import type { EntityState } from '../entities/state';

export interface CostRecordInput {
  id: CostRecordId;
  projectId: ProjectId;
  subject: CostSubject;
  type: CostRecordType;
  category: CostCategory;
  total: Money;
  breakdown?: CostBreakdown[];
  servicePeriod?: { start: string; end?: string };
  payment?: CostRecord['payment'];
}

export type CommandResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function createCostRecord(input: CostRecordInput): CommandResult<CostRecord> {
  if (!input.id || typeof input.id !== 'string') {
    return { ok: false, error: 'CostRecord id is required' };
  }
  if (!input.projectId || typeof input.projectId !== 'string') {
    return { ok: false, error: 'CostRecord projectId is required' };
  }
  if (!input.subject || typeof input.subject !== 'object') {
    return { ok: false, error: 'CostRecord subject is required' };
  }
  const validTypes: CostRecordType[] = ['estimate', 'committed', 'actual', 'refund'];
  if (!validTypes.includes(input.type)) {
    return { ok: false, error: `Invalid CostRecord type: ${input.type}` };
  }
  const validCategories: CostCategory[] = ['lodging', 'food', 'transport', 'attraction', 'shopping', 'other'];
  if (!validCategories.includes(input.category)) {
    return { ok: false, error: `Invalid CostRecord category: ${input.category}` };
  }
  if (!input.total || typeof input.total.amount !== 'number' || !Number.isFinite(input.total.amount) || typeof input.total.currency !== 'string') {
    return { ok: false, error: 'CostRecord total must be a valid Money object' };
  }
  if (input.breakdown) {
    for (const item of input.breakdown) {
      if (!item.amount || typeof item.amount.amount !== 'number' || !Number.isFinite(item.amount.amount) || typeof item.amount.currency !== 'string') {
        return { ok: false, error: 'CostBreakdown amount must be a valid Money object' };
      }
    }
  }

  const record: CostRecord = {
    id: input.id,
    projectId: input.projectId,
    subject: input.subject,
    type: input.type,
    category: input.category,
    total: input.total,
  };
  if (input.breakdown !== undefined) record.breakdown = input.breakdown;
  if (input.servicePeriod !== undefined) record.servicePeriod = input.servicePeriod;
  if (input.payment !== undefined) record.payment = input.payment;

  return { ok: true, value: record };
}

export interface CostAggregation {
  byCurrency: Record<string, Record<CostRecordType, number>>;
  netActualByCurrency: Record<string, number>;
}

export function aggregateCosts(records: CostRecord[]): CostAggregation {
  const byCurrency: Record<string, Record<CostRecordType, number>> = {};
  const netActualByCurrency: Record<string, number> = {};

  for (const record of records) {
    const currency = record.total.currency;
    if (!byCurrency[currency]) {
      byCurrency[currency] = { estimate: 0, committed: 0, actual: 0, refund: 0 };
    }
    byCurrency[currency][record.type] += record.total.amount;
    if (!netActualByCurrency[currency]) {
      netActualByCurrency[currency] = 0;
    }
    if (record.type === 'actual') {
      netActualByCurrency[currency] += record.total.amount;
    } else if (record.type === 'refund') {
      netActualByCurrency[currency] -= record.total.amount;
    }
  }

  return { byCurrency, netActualByCurrency };
}

export function addCostRecord(state: EntityState, record: CostRecord): CommandResult<EntityState> {
  if (state.costRecords.some((r) => r.id === record.id)) {
    return { ok: false, error: `CostRecord ${record.id} already exists` };
  }

  const project = state.projects.find((p) => p.id === record.projectId);
  if (!project) {
    return { ok: false, error: `Project ${record.projectId} not found` };
  }

  const subject = record.subject;
  if (!subject || typeof subject !== 'object') {
    return { ok: false, error: 'CostRecord subject is required' };
  }

  const validSubjectTypes: CostSubject['type'][] = ['planItem', 'booking', 'route', 'project'];
  if (!validSubjectTypes.includes(subject.type)) {
    return { ok: false, error: `Invalid CostRecord subject type: ${subject.type}` };
  }

  if (subject.type === 'planItem') {
    const planItem = state.planItems.find((i) => i.id === subject.id);
    if (!planItem) {
      return { ok: false, error: `PlanItem ${subject.id} not found` };
    }
    const planVersion = state.planVersions.find((v) => v.id === planItem.planVersionId);
    if (!planVersion || planVersion.projectId !== record.projectId) {
      return { ok: false, error: `PlanItem ${subject.id} does not belong to project ${record.projectId}` };
    }
  } else if (subject.type === 'booking') {
    const booking = state.bookings.find((b) => b.id === subject.id);
    if (!booking) {
      return { ok: false, error: `Booking ${subject.id} not found` };
    }
    if (booking.projectId !== record.projectId) {
      return { ok: false, error: `Booking ${subject.id} does not belong to project ${record.projectId}` };
    }
  } else if (subject.type === 'route') {
    const route = state.routes.find((r) => r.id === subject.id);
    if (!route) {
      return { ok: false, error: `Route ${subject.id} not found` };
    }
  } else if (subject.type === 'project') {
    if (subject.id !== record.projectId) {
      return { ok: false, error: `Project subject ${subject.id} does not match record project ${record.projectId}` };
    }
  }

  if (typeof record.total.amount !== 'number' || !Number.isFinite(record.total.amount) || record.total.amount < 0) {
    return { ok: false, error: 'CostRecord total amount must be a finite number >= 0' };
  }
  if (typeof record.total.currency !== 'string' || record.total.currency.length === 0) {
    return { ok: false, error: 'CostRecord total currency must be a non-empty string' };
  }

  if (record.breakdown) {
    let breakdownSum = 0;
    for (const item of record.breakdown) {
      if (typeof item.amount.amount !== 'number' || !Number.isFinite(item.amount.amount) || item.amount.amount < 0) {
        return { ok: false, error: 'CostBreakdown amount must be a finite number >= 0' };
      }
      if (typeof item.amount.currency !== 'string' || item.amount.currency.length === 0) {
        return { ok: false, error: 'CostBreakdown currency must be a non-empty string' };
      }
      if (item.amount.currency !== record.total.currency) {
        return { ok: false, error: 'CostBreakdown currency must match total currency' };
      }
      breakdownSum += item.amount.amount;
    }
    if (breakdownSum > record.total.amount) {
      return { ok: false, error: 'CostBreakdown sum exceeds total amount' };
    }
  }

  return {
    ok: true,
    value: {
      ...state,
      costRecords: [...state.costRecords, record],
    },
  };
}
