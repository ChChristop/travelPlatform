# R1-B Handoff

## Scope
Implemented/corrected Session B domain entity types only: booking.ts, cost.ts, route.ts, task.ts, alternatives.ts, scenario.ts, run.ts. No store, runtime, UI, or A/D files touched.

## Corrective changes applied
- Added required `projectId: ProjectId` to `Booking` and `CostRecord`.
- Removed duplicated `PaymentInfo`/`PaymentStatus` from cost.ts; now imports shared `Money` and `PaymentInfo` from `./money`, preserving branded `PaymentMethodId`/`UserId` for methodId/payerId.
- Applied ISO aliases: `ISODate` for CostBreakdown.date and CostRecord.servicePeriod.start/end; `ISODateTime` for Booking.datetime/bookedAt/cancellationDeadline, TripRun.startedAt/completedAt, ItemExecution.actualStart/actualEnd, and Trigger absoluteTime.at.
- Preserved existing ownership fields, discriminated unions, optional fields, and RouteLeg value-object shape.

## Validation
- Scope validation requested for owned files.
- No build/typecheck claimed unless runner returns explicit result. Integration exports and type tests remain Session D responsibility.

## Remaining risks
- Cross-entity runtime ownership/reference validation is intentionally deferred to store/runtime phase.
- ISO aliases are string aliases only; no runtime date validation is performed.
- Session D must verify strict compile and negative contracts across A/B files.
