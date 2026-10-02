import { migrate } from '../domain/migrations/migrate.ts';
import { events, todos } from '../data/trip.js';
import { loadState, saveState } from '../persistence/storage.ts';
import { SEED_COST_DETAILS } from './seedCostDetails.js';

const STORAGE_KEY = 'kansai-trip-navigator:r6:state';

const MENU_LABELS = {
  'kamu-kix': '맛있는 라멘(おいしいラーメン)',
  'aburiya': '국내소 무한리필',
  'seizen': '숙성 로스 150g + 특제 멘치',
  'bajitofu': '모모·세세리·네기마·츠쿠네·닭날개',
  'kyorinsen': '평일 쿄고젠',
  'kanei': '매운무 오로시소바 + 소바두부',
  'spice': '치킨 키마카레',
  'rakukanki': '샤오룽바·찐 닭·가리비·새우',
  'quattro': 'B세트',
};

const USER_LODGING_SEEDS = [
  {
    id: 'sarasa-checkin',
    name: 'SARASA HOTEL Shinsaibashi',
    checkIn: '2026-09-26',
    checkOut: '2026-09-28',
    totalKRW: 55000,
    status: 'confirmed'
  },
  {
    id: 'smile-checkin',
    name: 'Smile Hotel Kyoto Shijo',
    checkIn: '2026-09-28',
    checkOut: '2026-09-30',
    totalKRW: 55000,
    status: 'confirmed'
  },
  {
    id: 'kobe-checkin',
    name: 'Kobe Port Tower Hotel',
    checkIn: '2026-09-30',
    checkOut: '2026-10-01',
    totalKRW: 55000,
    status: 'confirmed'
  }
];

const ECB_JPY_PER_KRW = 0.116056334365003;
const ECB_RATE_NOTE = 'Rate 1 KRW=0.116056334365003 JPY, source ECB reference rate, date 2026-10-01, rounded to nearest JPY';

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

function parsePriceToAmount(priceStr) {
  if (!priceStr || typeof priceStr !== 'string') return null;
  const match = priceStr.match(/¥\s*([0-9][0-9,]*)/);
  if (!match) return null;
  const num = Number(match[1].replace(/,/g, ""));
  if (isNaN(num) || num <= 0) return null;
  return num;
}

function parsePriceRange(priceStr) {
  if (!priceStr || typeof priceStr !== 'string') return null;
  const match = priceStr.match(/¥\s*([0-9][0-9,]*)\s*~\s*([0-9][0-9,]*)/);
  if (!match) return null;
  const min = Number(match[1].replace(/,/g, ""));
  const max = Number(match[2].replace(/,/g, ""));
  if (isNaN(min) || isNaN(max) || min <= 0 || max <= 0) return null;
  return { min, max };
}

function mapEventToCategory(eventType) {
  if (!eventType) return 'other';
  const t = String(eventType).toLowerCase();
  if (t === 'food' || t === 'meal') return 'food';
  if (t === 'hotel' || t === 'lodging') return 'lodging';
  if (t === 'flight' || t === 'arrival' || t === 'transit' || t === 'transport') return 'transport';
  if (t === 'sight' || t === 'attraction') return 'attraction';
  if (t === 'shopping') return 'shopping';
  return 'other';
}

function buildSeedState() {
  const input = {
    events: events,
    todos: todos,
  };
  const result = migrate(input);
  const seed = result.seed;

  const costRecords = [];
  for (const event of events) {
    if (event.price) {
      const amount = parsePriceToAmount(event.price);
      if (amount !== null) {
        const planItemId = `plan-item:${event.id}`;
        const category = mapEventToCategory(event.type);

        const record = {
          id: `cost_seed_${event.id}`,
          projectId: seed.project.id,
          subject: { type: 'planItem', id: planItemId },
          type: 'estimate',
          category: category,
          total: { amount: amount, currency: 'JPY' },
          sourcePriceText: event.price
        };

        const range = parsePriceRange(event.price);
        if (range) {
          record.estimateRange = {
            min: { amount: range.min, currency: 'JPY' },
            max: { amount: range.max, currency: 'JPY' }
          };
        }

        const details = SEED_COST_DETAILS[event.id];
        if (details) {
          record.breakdown = details.breakdown.map((item) => ({
            type: 'custom',
            label: item.label,
            amount: { amount: item.amount, currency: 'JPY' }
          }));
          record.pricingSourceUrl = details.sourceUrl;
          record.pricingNote = details.pricingNote;
        } else {
          const menuLabel = MENU_LABELS[event.id] || event.price;
          record.breakdown = [
            {
              type: 'custom',
              label: menuLabel,
              amount: { amount: amount, currency: 'JPY' }
            }
          ];
        }

        costRecords.push(record);
      }
    }
  }

  const baseState = {
    projects: [seed.project],
    planVersions: [seed.planVersion],
    planItems: seed.planItems,
    places: seed.places,
    bookings: seed.bookings,
    costRecords: costRecords,
    routes: [],
    tasks: seed.tasks,
    planFragments: [],
    planOptions: [],
    optionGroups: [],
    scenarios: [],
    constraints: [],
    tripRuns: [],
    itemExecutions: [],
  };

  return enrichStateWithUserLodging(baseState);
}

function enrichStateWithLegacyCosts(state) {
  if (!state || !Array.isArray(state.costRecords)) {
    return state;
  }

  const existingKeys = new Set();
  const existingIds = new Set();
  for (const record of state.costRecords) {
    if (record && record.subject && record.subject.type === 'planItem') {
      existingKeys.add(`${record.subject.id}|${record.type}|${record.category}`);
    }
    if (record && record.id) {
      existingIds.add(record.id);
    }
  }

  const newRecords = [];
  const planItems = Array.isArray(state.planItems) ? state.planItems : [];
  const planVersions = Array.isArray(state.planVersions) ? state.planVersions : [];
  const projects = Array.isArray(state.projects) ? state.projects : [];

  for (const event of events) {
    if (event.price) {
      const amount = parsePriceToAmount(event.price);
      if (amount !== null) {
        const planItemId = `plan-item:${event.id}`;
        const category = mapEventToCategory(event.type);
        const key = `${planItemId}|estimate|${category}`;
        const recordId = `cost_seed_${event.id}`;

        if (!existingKeys.has(key) && !existingIds.has(recordId)) {
          const planItem = planItems.find((item) => item && item.id === planItemId);
          if (planItem) {
            let projectId = null;
            const planVersion = planVersions.find((pv) => pv && pv.id === planItem.planVersionId);
            if (planVersion) {
              projectId = planVersion.projectId;
            } else {
              const project = projects.find((p) => p && p.id === planItem.projectId);
              if (project) {
                projectId = project.id;
              }
            }

            if (projectId) {
              const record = {
                id: recordId,
                projectId: projectId,
                subject: { type: 'planItem', id: planItemId },
                type: 'estimate',
                category: category,
                total: { amount: amount, currency: 'JPY' },
                sourcePriceText: event.price
              };

              const range = parsePriceRange(event.price);
              if (range) {
                record.estimateRange = {
                  min: { amount: range.min, currency: 'JPY' },
                  max: { amount: range.max, currency: 'JPY' }
                };
              }

              const details = SEED_COST_DETAILS[event.id];
              if (details) {
                record.breakdown = details.breakdown.map((item) => ({
                  type: 'custom',
                  label: item.label,
                  amount: { amount: item.amount, currency: 'JPY' }
                }));
                record.pricingSourceUrl = details.sourceUrl;
                record.pricingNote = details.pricingNote;
              } else {
                const menuLabel = MENU_LABELS[event.id] || event.price;
                record.breakdown = [
                  {
                    type: 'custom',
                    label: menuLabel,
                    amount: { amount: amount, currency: 'JPY' }
                  }
                ];
              }

              newRecords.push(record);
              existingKeys.add(key);
              existingIds.add(recordId);
            }
          }
        }
      }
    }
  }

  if (newRecords.length > 0) {
    return {
      ...state,
      costRecords: [...state.costRecords, ...newRecords]
    };
  }

  return state;
}

function upgradeSeedCostRecords(state) {
  if (!state || !Array.isArray(state.costRecords)) {
    return state;
  }

  const LEGACY_PRICE_EVENTS = ['kamu-kix', 'aburiya', 'seizen', 'bajitofu', 'kyorinsen', 'kanei', 'spice', 'rakukanki', 'quattro'];
  const MULTI_MENU_EVENTS = ['seizen', 'kanei', 'rakukanki', 'bajitofu'];

  let changed = false;
  const updatedRecords = state.costRecords.map((record) => {
    if (!record || typeof record.id !== 'string' || !record.id.startsWith('cost_seed_')) {
      return record;
    }

    const eventId = record.id.replace('cost_seed_', '');
    if (!LEGACY_PRICE_EVENTS.includes(eventId)) {
      return record;
    }

    const event = events.find((e) => e.id === eventId);
    if (!event || !event.price) {
      return record;
    }

    const amount = parsePriceToAmount(event.price);
    if (amount === null) {
      return record;
    }

    const expectedCategory = mapEventToCategory(event.type);
    if (record.category !== expectedCategory) {
      return record;
    }

    if (!record.subject || record.subject.type !== 'planItem' || record.subject.id !== `plan-item:${event.id}`) {
      return record;
    }

    if (record.type !== 'estimate') {
      return record;
    }

    if (!record.total || record.total.amount !== amount || record.total.currency !== 'JPY') {
      return record;
    }

    if (!Array.isArray(record.breakdown) || record.breakdown.length !== 1) {
      return record;
    }

    const item = record.breakdown[0];
    if (!item || item.type !== 'custom') {
      return record;
    }

    if (!item.amount || item.amount.amount !== amount || item.amount.currency !== 'JPY') {
      return record;
    }

    const menuLabel = MENU_LABELS[eventId];
    const isPriceOnly = item.label === event.price;
    const isCompositeLabel = MULTI_MENU_EVENTS.includes(eventId) && item.label === menuLabel;

    if (!isPriceOnly && !isCompositeLabel) {
      return record;
    }

    changed = true;

    const range = parsePriceRange(event.price);
    const expectedEstimateRange = range ? {
      min: { amount: range.min, currency: 'JPY' },
      max: { amount: range.max, currency: 'JPY' }
    } : undefined;

    const details = SEED_COST_DETAILS[eventId];
    let newBreakdown;
    let pricingSourceUrl;
    let pricingNote;

    if (details) {
      newBreakdown = details.breakdown.map((d) => ({
        type: 'custom',
        label: d.label,
        amount: { amount: d.amount, currency: 'JPY' }
      }));
      pricingSourceUrl = details.sourceUrl;
      pricingNote = details.pricingNote;
    } else {
      newBreakdown = [{
        type: 'custom',
        label: menuLabel,
        amount: { amount: amount, currency: 'JPY' }
      }];
      pricingSourceUrl = undefined;
      pricingNote = undefined;
    }

    return {
      ...record,
      breakdown: newBreakdown,
      sourcePriceText: event.price,
      estimateRange: expectedEstimateRange,
      pricingSourceUrl: pricingSourceUrl,
      pricingNote: pricingNote
    };
  });

  if (changed) {
    return {
      ...state,
      costRecords: updatedRecords
    };
  }

  return state;
}

function enrichStateWithUserLodging(state) {
  if (!state) return state;

  const planItems = Array.isArray(state.planItems) ? state.planItems : [];
  const bookings = Array.isArray(state.bookings) ? state.bookings : [];
  const costRecords = Array.isArray(state.costRecords) ? state.costRecords : [];
  const projects = Array.isArray(state.projects) ? state.projects : [];

  const existingBookingIds = new Set(bookings.map((b) => b && b.id).filter(Boolean));
  const existingCostIds = new Set(costRecords.map((c) => c && c.id).filter(Boolean));

  let planItemsChanged = false;
  const updatedPlanItems = planItems.map((item) => {
    if (!item) return item;
    const lodging = USER_LODGING_SEEDS.find((l) => `plan-item:${l.id}` === item.id);
    if (lodging) {
      const desiredTitle = lodging.name;
      const desiredStart = `${lodging.checkIn}T00:00:00+09:00`;
      const desiredEnd = `${lodging.checkOut}T00:00:00+09:00`;
      const desiredAllDay = true;

      const currentTitle = item.title;
      const currentSchedule = item.schedule;
      const currentStart = currentSchedule ? currentSchedule.start : undefined;
      const currentEnd = currentSchedule ? currentSchedule.end : undefined;
      const currentAllDay = currentSchedule ? currentSchedule.allDay : undefined;

      const isMatch =
        currentTitle === desiredTitle &&
        currentStart === desiredStart &&
        currentEnd === desiredEnd &&
        currentAllDay === desiredAllDay;

      if (!isMatch) {
        planItemsChanged = true;
        return {
          ...item,
          title: desiredTitle,
          schedule: {
            start: desiredStart,
            end: desiredEnd,
            allDay: desiredAllDay
          }
        };
      }
      return item;
    }
    return item;
  });

  const newBookings = [];
  const newCostRecords = [];
  const updatedCostRecords = [];
  let costRecordsChanged = false;

  for (const lodging of USER_LODGING_SEEDS) {
    const planItemId = `plan-item:${lodging.id}`;
    const bookingId = `booking:${lodging.id}`;
    const costId = `cost_seed_lodging_${lodging.id}`;

    const existingPlanItem = planItems.find((item) => item && item.id === planItemId);
    if (!existingPlanItem) {
      continue;
    }

    const projectId = projects.length > 0 ? projects[0].id : null;
    if (!projectId) continue;

    if (!existingBookingIds.has(bookingId)) {
      newBookings.push({
        id: bookingId,
        projectId: projectId,
        planItemIds: [planItemId],
        type: 'hotel',
        status: 'confirmed'
      });
    }

    const jpyAmount = Math.round(lodging.totalKRW * ECB_JPY_PER_KRW);
    const sourcePriceText = `₩${lodging.totalKRW.toLocaleString('ko-KR')} KRW`;
    const servicePeriod = {
      start: lodging.checkIn,
      end: lodging.checkOut
    };

    const existingCostRecord = costRecords.find((c) => c && c.id === costId);

    if (existingCostRecord) {
      const needsUpdate =
        !existingCostRecord.total ||
        existingCostRecord.total.amount !== jpyAmount ||
        existingCostRecord.total.currency !== 'JPY' ||
        existingCostRecord.type !== 'committed' ||
        existingCostRecord.category !== 'lodging' ||
        !existingCostRecord.subject ||
        existingCostRecord.subject.type !== 'planItem' ||
        existingCostRecord.subject.id !== planItemId ||
        !existingCostRecord.servicePeriod ||
        existingCostRecord.servicePeriod.start !== servicePeriod.start ||
        existingCostRecord.servicePeriod.end !== servicePeriod.end ||
        existingCostRecord.sourcePriceText !== sourcePriceText ||
        existingCostRecord.pricingNote !== ECB_RATE_NOTE;

      if (needsUpdate) {
        costRecordsChanged = true;
        updatedCostRecords.push({
          ...existingCostRecord,
          total: { amount: jpyAmount, currency: 'JPY' },
          type: 'committed',
          category: 'lodging',
          subject: { type: 'planItem', id: planItemId },
          servicePeriod: servicePeriod,
          sourcePriceText: sourcePriceText,
          pricingNote: ECB_RATE_NOTE
        });
      } else {
        updatedCostRecords.push(existingCostRecord);
      }
    } else {
      newCostRecords.push({
        id: costId,
        projectId: projectId,
        subject: { type: 'planItem', id: planItemId },
        type: 'committed',
        category: 'lodging',
        total: { amount: jpyAmount, currency: 'JPY' },
        servicePeriod: servicePeriod,
        sourcePriceText: sourcePriceText,
        pricingNote: ECB_RATE_NOTE
      });
    }
  }

  if (!planItemsChanged && newBookings.length === 0 && newCostRecords.length === 0 && !costRecordsChanged) {
    return state;
  }

  let finalCostRecords = costRecords;
  if (costRecordsChanged) {
    finalCostRecords = updatedCostRecords;
  }
  if (newCostRecords.length > 0) {
    finalCostRecords = [...finalCostRecords, ...newCostRecords];
  }

  return {
    ...state,
    planItems: planItemsChanged ? updatedPlanItems : planItems,
    bookings: newBookings.length > 0 ? [...bookings, ...newBookings] : bookings,
    costRecords: finalCostRecords
  };
}

/**
 * @returns {import('./types.js').DataSourceResult}
 */
export function getPlatformState() {
  try {
    const storage = getStorage();
    if (storage) {
      // Directly check for missing key to distinguish from corrupt data
      const raw = storage.getItem(STORAGE_KEY);
      if (raw === null) {
        // Key missing: use seed
        const state = buildSeedState();
        const saveResult = saveState(storage, STORAGE_KEY, state);
        if (!saveResult.ok) {
          return { state: null, error: `시드 데이터 저장 실패: ${saveResult.error}` };
        }
        return { state, error: null };
      }

      // Key exists: attempt to load
      const loadResult = loadState(storage, STORAGE_KEY);
      if (loadResult.ok) {
        const loadedState = loadResult.data;
        let enrichedState = enrichStateWithLegacyCosts(loadedState);

        const upgradedState = upgradeSeedCostRecords(enrichedState);
        if (upgradedState !== enrichedState) {
          enrichedState = upgradedState;
        }

        const lodgingEnrichedState = enrichStateWithUserLodging(enrichedState);
        if (lodgingEnrichedState !== enrichedState) {
          enrichedState = lodgingEnrichedState;
        }

        if (enrichedState !== loadedState) {
          const saveResult = saveState(storage, STORAGE_KEY, enrichedState);
          if (!saveResult.ok) {
            return { state: null, error: `데이터 저장 실패: ${saveResult.error}` };
          }
        }
        return { state: enrichedState, error: null };
      }

      // Data is corrupt or invalid. Preserve raw data (do not overwrite) and return error.
      return { state: null, error: `데이터 손상 또는 유효하지 않음: ${loadResult.error}` };
    }

    // Storage unavailable: use seed in memory (cannot persist)
    const state = buildSeedState();
    return { state, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { state: null, error: message };
  }
}

/**
 * Saves the current state to storage.
 * @param {import('./types.js').EntityState} state
 * @returns {{ ok: boolean; error?: string }}
 */
export function savePlatformState(state) {
  const storage = getStorage();
  if (!storage) {
    return { ok: false, error: 'Storage unavailable' };
  }
  const result = saveState(storage, STORAGE_KEY, state);
  return result;
}