import type { EntityState } from '../store/entities/state.ts';
import { ENVELOPE_VERSION, type PersistenceEnvelope } from './envelope.ts';
import { validateReferenceRules } from '../domain/validation/reference-rules.ts';
import { validateValueRules, type ValueRuleInput } from '../domain/validation/value-rules.ts';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SaveResult = { ok: true } | { ok: false; error: string };
export type LoadResult = { ok: true; data: EntityState } | { ok: false; error: string };

function buildValueRuleInput(state: EntityState): ValueRuleInput {
  return {
    optionGroups: state.optionGroups,
    planOptions: state.planOptions,
    planItems: state.planItems,
    tripRuns: state.tripRuns,
    itemExecutions: state.itemExecutions,
    places: state.places,
    moneyValues: [],
  };
}

function validateState(state: EntityState): string | null {
  try {
    const referenceErrors = validateReferenceRules({
      places: state.places,
      planVersions: state.planVersions,
      planItems: state.planItems,
      costRecords: state.costRecords,
    });
    const valueErrors = validateValueRules(buildValueRuleInput(state));
    const allErrors = [...referenceErrors, ...valueErrors];
    if (allErrors.length > 0) {
      return allErrors.map((e) => e.message).join('; ');
    }
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Validation error: ${message}`;
  }
}

export function saveState(storage: StorageAdapter, key: string, state: EntityState): SaveResult {
  try {
    const envelope: PersistenceEnvelope = {
      version: ENVELOPE_VERSION,
      savedAt: new Date().toISOString(),
      data: state,
    };
    const serialized = JSON.stringify(envelope);
    storage.setItem(key, serialized);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export function loadState(storage: StorageAdapter, key: string): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to read storage: ${message}` };
  }

  if (raw === null) {
    return { ok: false, error: 'No data found for key' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Invalid JSON: ${message}` };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'Envelope is not an object' };
  }

  const envelope = parsed as Record<string, unknown>;

  if (typeof envelope.version !== 'number') {
    return { ok: false, error: 'Envelope version is missing or not a number' };
  }

  if (envelope.version !== ENVELOPE_VERSION) {
    return { ok: false, error: `Unsupported envelope version: ${envelope.version}. Expected ${ENVELOPE_VERSION}.` };
  }

  if (typeof envelope.savedAt !== 'string') {
    return { ok: false, error: 'Envelope savedAt is missing or not a string' };
  }

  if (typeof envelope.data !== 'object' || envelope.data === null) {
    return { ok: false, error: 'Envelope data is missing or not an object' };
  }

  const data = envelope.data as EntityState;

  const validationError = validateState(data);
  if (validationError !== null) {
    return { ok: false, error: `Validation failed: ${validationError}` };
  }

  return { ok: true, data };
}

export function exportState(state: EntityState): string {
  const envelope: PersistenceEnvelope = {
    version: ENVELOPE_VERSION,
    savedAt: new Date().toISOString(),
    data: state,
  };
  return JSON.stringify(envelope);
}

export function importState(json: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Invalid JSON: ${message}` };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'Envelope is not an object' };
  }

  const envelope = parsed as Record<string, unknown>;

  if (typeof envelope.version !== 'number') {
    return { ok: false, error: 'Envelope version is missing or not a number' };
  }

  if (envelope.version !== ENVELOPE_VERSION) {
    return { ok: false, error: `Unsupported envelope version: ${envelope.version}. Expected ${ENVELOPE_VERSION}.` };
  }

  if (typeof envelope.savedAt !== 'string') {
    return { ok: false, error: 'Envelope savedAt is missing or not a string' };
  }

  if (typeof envelope.data !== 'object' || envelope.data === null) {
    return { ok: false, error: 'Envelope data is missing or not an object' };
  }

  const data = envelope.data as EntityState;

  const validationError = validateState(data);
  if (validationError !== null) {
    return { ok: false, error: `Validation failed: ${validationError}` };
  }

  return { ok: true, data };
}
