import type {
  PlanItem,
  Booking,
  CostRecord,
  TripRun,
  ItemExecution,
  PlaceReference,
  LodgingDetail,
  MealDetail,
  PlanItemType,
  Schedule,
  BookingType,
  BookingStatus,
  CostRecordType,
  CostCategory,
  CostSubjectType,
  CostBreakdownType,
  CostBreakdown,
  TaskStatus,
  ScenarioType,
  ConstraintType,
  ConstraintHardness,
  TripRunStatus,
  ItemExecutionStatus,
  Money,
  PaymentInfo,
  Place,
  BookingPolicy,
  WorkspaceId,
  UserId,
  ProjectId,
  PlanVersionId,
  PlanItemId,
  PlaceId,
  BookingId,
  CostRecordId,
  RouteId,
  TaskId,
  PlanFragmentId,
  PlanOptionId,
  OptionGroupId,
  ScenarioId,
  ConstraintId,
  TripRunId,
  ItemExecutionId,
  AttachmentId,
  TemplateId,
  CollectionId,
  PaymentMethodId,
  ISODate,
  ISODateTime
} from '../../src/domain';

// Branded ID fixtures
const wsId = 'ws-1' as WorkspaceId;
const userId = 'user-1' as UserId;
const projectId = 'proj-1' as ProjectId;
const planVersionId = 'pv-1' as PlanVersionId;
const planItemId = 'pi-1' as PlanItemId;
const placeId = 'pl-1' as PlaceId;
const bookingId = 'bk-1' as BookingId;
const costRecordId = 'cr-1' as CostRecordId;
const routeId = 'rt-1' as RouteId;
const taskId = 'tk-1' as TaskId;
const planFragmentId = 'pf-1' as PlanFragmentId;
const planOptionId = 'po-1' as PlanOptionId;
const optionGroupId = 'og-1' as OptionGroupId;
const scenarioId = 'sc-1' as ScenarioId;
const constraintId = 'cn-1' as ConstraintId;
const tripRunId = 'tr-1' as TripRunId;
const itemExecutionId = 'ie-1' as ItemExecutionId;
const attachmentId = 'at-1' as AttachmentId;
const templateId = 'tp-1' as TemplateId;
const collectionId = 'cl-1' as CollectionId;
const paymentMethodId = 'pm-1' as PaymentMethodId;

// 1. Valid PlanItem for all 10 types
const lodgingItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'lodging',
  title: 'Hotel Stay',
  schedule: { start: '2026-09-26T15:00:00+09:00', end: '2026-09-28T11:00:00+09:00' },
  places: [{ placeId, role: 'primary' }],
  detail: { type: 'lodging', roomType: 'Double' },
  status: 'planned'
};

const mealItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'meal',
  title: 'Lunch',
  schedule: { start: '2026-09-26T12:00:00+09:00' },
  places: [{ placeId, role: 'primary' }],
  detail: { type: 'meal' },
  status: 'planned'
};

const transportItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'transport',
  title: 'Train to Kyoto',
  schedule: { start: '2026-09-26T09:00:00+09:00' },
  places: [{ placeId, role: 'origin' }],
  detail: { type: 'transport' },
  status: 'planned'
};

const attractionItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'attraction',
  title: 'Fushimi Inari',
  schedule: { start: '2026-09-26T10:00:00+09:00' },
  places: [{ placeId, role: 'primary' }],
  detail: { type: 'attraction' },
  status: 'planned'
};

const shoppingItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'shopping',
  title: 'Nishiki Market',
  schedule: { start: '2026-09-26T14:00:00+09:00' },
  places: [{ placeId, role: 'primary' }],
  detail: { type: 'shopping' },
  status: 'planned'
};

const flightItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'flight',
  title: 'Flight to Osaka',
  schedule: { start: '2026-09-26T08:00:00+09:00' },
  places: [{ placeId, role: 'origin' }],
  detail: { type: 'flight' },
  status: 'planned'
};

const eventItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'event',
  title: 'Concert',
  schedule: { start: '2026-09-27T19:00:00+09:00' },
  places: [{ placeId, role: 'primary' }],
  detail: { type: 'event' },
  status: 'planned'
};

const freeTimeItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'freeTime',
  title: 'Free Time',
  schedule: { start: '2026-09-27T15:00:00+09:00' },
  places: [],
  detail: { type: 'freeTime' },
  status: 'planned'
};

const taskItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'task',
  title: 'Buy Tickets',
  schedule: { start: '2026-09-25T10:00:00+09:00' },
  places: [],
  detail: { type: 'task' },
  status: 'planned'
};

const customItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'custom',
  title: 'Custom Activity',
  schedule: { start: '2026-09-28T10:00:00+09:00' },
  places: [{ placeId, role: 'primary' }],
  detail: { type: 'custom' },
  status: 'planned'
};

// 2. Type/detail mismatch rejection
// @ts-expect-error - type 'lodging' requires detail.type 'lodging'
const invalidLodgingItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'lodging',
  title: 'Invalid',
  schedule: {},
  places: [],
  detail: { type: 'meal' },
  status: 'planned'
};

// @ts-expect-error - type 'meal' requires detail.type 'meal'
const invalidMealItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'meal',
  title: 'Invalid',
  schedule: {},
  places: [],
  detail: { type: 'lodging' },
  status: 'planned'
};

// 3. Different Entity ID assignment rejection
const invalidPlaceRef: PlaceReference = {
  // @ts-expect-error - PlanItemId cannot be assigned to PlaceId
  placeId: planItemId,
  role: 'primary'
};

const invalidBookingRef: PlanItem = {
  // @ts-expect-error - BookingId cannot be assigned to PlanItemId
  id: bookingId,
  planVersionId,
  type: 'meal',
  title: 'Invalid',
  schedule: {},
  places: [],
  detail: { type: 'meal' },
  status: 'planned'
};

// 4. BookingPolicy vs Booking rejection
const policy: BookingPolicy = { availability: 'available', requirement: 'required' };
// @ts-expect-error - policy is not an actual Booking
const invalidBookingAsPolicy: Booking = policy;

// 5. Invalid run/execution status rejection
const invalidTripRun: TripRun = {
  id: tripRunId,
  projectId,
  planVersionId,
  // @ts-expect-error - 'invalidStatus' is not a valid TripRunStatus
  status: 'invalidStatus'
};

const invalidItemExecution: ItemExecution = {
  id: itemExecutionId,
  tripRunId,
  planItemId,
  // @ts-expect-error - 'invalidStatus' is not a valid ItemExecutionStatus
  status: 'invalidStatus'
};

// 6. Cross-day lodging and optional coordinates/schedule allowance
const crossDayLodging: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'lodging',
  title: 'Cross-day Stay',
  schedule: {
    start: '2026-09-26T15:00:00+09:00',
    end: '2026-09-29T11:00:00+09:00'
  },
  places: [{ placeId, role: 'primary' }],
  detail: {
    type: 'lodging',
    roomType: 'Twin',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    luggageStorage: { beforeCheckIn: true, afterCheckOut: false }
  },
  status: 'confirmed'
};

const optionalCoordinatesPlace: Place = {
  id: placeId,
  workspaceId: wsId,
  name: 'Test Place',
  localName: 'テスト',
  address: '1-2-3 Test City',
  region: { country: 'Japan', prefecture: 'Kyoto', city: 'Kyoto' },
  providerIds: { osm: '12345', google: '67890' },
  urls: { official: 'https://example.com', map: 'https://maps.example.com' }
};

const noCoordinatesPlace: Place = {
  id: placeId,
  workspaceId: wsId,
  name: 'Place Without Coordinates'
};

const optionalScheduleItem: PlanItem = {
  id: planItemId,
  planVersionId,
  type: 'freeTime',
  title: 'Flexible Time',
  schedule: {
    allDay: true,
    flexibility: {
      type: 'window',
      earliestStart: '2026-09-26T09:00:00+09:00',
      latestStart: '2026-09-26T17:00:00+09:00'
    }
  },
  places: [],
  detail: { type: 'freeTime' },
  status: 'planned'
};

// 7. Ownership negative cases
const validPlace: Place = {
  id: placeId,
  workspaceId: wsId,
  name: 'Valid Place'
};

// @ts-expect-error - Place requires workspaceId
const invalidPlace: Place = {
  id: placeId,
  name: 'Invalid Place'
};

const validBooking: Booking = {
  id: bookingId,
  projectId,
  planItemIds: [planItemId],
  type: 'hotel',
  status: 'confirmed'
};

// @ts-expect-error - Booking requires projectId
const invalidBooking: Booking = {
  id: bookingId,
  planItemIds: [planItemId],
  type: 'hotel',
  status: 'confirmed'
};

const sharedPayment: PaymentInfo = { status: 'paid', paidAt: '2026-09-26T10:00:00+09:00', methodId: paymentMethodId, payerId: userId };

const validCostRecord: CostRecord = {
  id: costRecordId,
  projectId,
  subject: { type: 'planItem', id: planItemId },
  type: 'actual',
  category: 'lodging',
  total: { amount: 18000, currency: 'JPY' },
  payment: sharedPayment
};

// @ts-expect-error - CostRecord requires projectId
const invalidCostRecord: CostRecord = {
  id: costRecordId,
  subject: { type: 'planItem', id: planItemId },
  type: 'actual',
  category: 'lodging',
  total: { amount: 18000, currency: 'JPY' },
  payment: sharedPayment
};

// 8. Positive Booking/CostRecord with shared PaymentInfo
const positiveBooking: Booking = {
  id: bookingId,
  projectId,
  planItemIds: [planItemId],
  type: 'hotel',
  status: 'confirmed',
  provider: 'Hotel Provider',
  datetime: '2026-09-26T15:00:00+09:00',
  partySize: 2,
  confirmationCode: 'CONF-123',
  bookingUrl: 'https://booking.example.com',
  bookedAt: '2026-09-25T10:00:00+09:00',
  cancellationDeadline: '2026-09-24T10:00:00+09:00',
  costRecordIds: [costRecordId],
  attachmentIds: [attachmentId]
};

const positiveCostRecord: CostRecord = {
  id: costRecordId,
  projectId,
  subject: { type: 'booking', id: bookingId },
  type: 'actual',
  category: 'lodging',
  total: { amount: 18000, currency: 'JPY' },
  breakdown: [
    { type: 'night', date: '2026-09-26', amount: { amount: 8000, currency: 'JPY' } },
    { type: 'night', date: '2026-09-27', amount: { amount: 10000, currency: 'JPY' } }
  ],
  servicePeriod: { start: '2026-09-26', end: '2026-09-28' },
  payment: sharedPayment
};

// Verify all types are exported and usable
const _typeChecks: {
  planItemType: PlanItemType;
  schedule: Schedule;
  lodgingDetail: LodgingDetail;
  mealDetail: MealDetail;
  bookingType: BookingType;
  bookingStatus: BookingStatus;
  costRecordType: CostRecordType;
  costCategory: CostCategory;
  costSubjectType: CostSubjectType;
  costBreakdownType: CostBreakdownType;
  costBreakdown: CostBreakdown;
  taskStatus: TaskStatus;
  scenarioType: ScenarioType;
  constraintType: ConstraintType;
  constraintHardness: ConstraintHardness;
  tripRunStatus: TripRunStatus;
  itemExecutionStatus: ItemExecutionStatus;
  money: Money;
  paymentInfo: PaymentInfo;
  place: Place;
  placeReference: PlaceReference
} = {
  planItemType: 'lodging',
  schedule: { start: '2026-09-26T10:00:00+09:00' },
  lodgingDetail: { type: 'lodging' },
  mealDetail: { type: 'meal' },
  bookingType: 'hotel',
  bookingStatus: 'confirmed',
  costRecordType: 'actual',
  costCategory: 'lodging',
  costSubjectType: 'planItem',
  costBreakdownType: 'night',
  costBreakdown: { type: 'night', amount: { amount: 1000, currency: 'JPY' } },
  taskStatus: 'todo',
  scenarioType: 'normal',
  constraintType: 'fixedTime',
  constraintHardness: 'hard',
  tripRunStatus: 'active',
  itemExecutionStatus: 'pending',
  money: { amount: 10000, currency: 'JPY' },
  paymentInfo: { status: 'unpaid' },
  place: optionalCoordinatesPlace,
  placeReference: { placeId, role: 'primary' }
};

// Suppress unused variable warnings for type-checking purposes
void _typeChecks;
void lodgingItem;
void mealItem;
void transportItem;
void attractionItem;
void shoppingItem;
void flightItem;
void eventItem;
void freeTimeItem;
void taskItem;
void customItem;
void invalidLodgingItem;
void invalidMealItem;
void invalidPlaceRef;
void invalidBookingRef;
void invalidBookingAsPolicy;
void invalidTripRun;
void invalidItemExecution;
void crossDayLodging;
void optionalCoordinatesPlace;
void noCoordinatesPlace;
void optionalScheduleItem;
void validPlace;
void invalidPlace;
void validBooking;
void invalidBooking;
void validCostRecord;
void invalidCostRecord;
void sharedPayment;
void positiveBooking;
void positiveCostRecord;
void routeId;
void taskId;
void planFragmentId;
void planOptionId;
void optionGroupId;
void scenarioId;
void constraintId;
void attachmentId;
void templateId;
void collectionId;
