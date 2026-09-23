# R1-B corrective task

Fix only your files. Your previous handoff claimed all ownership fields existed, but Booking.projectId and CostRecord.projectId are missing.
1. REQUIRED projectId: ProjectId on Booking and CostRecord. Import ProjectId from ids.ts.
2. Remove duplicated PaymentInfo/PaymentStatus declaration in cost.ts. Import type {Money, PaymentInfo} from './money' and use shared PaymentInfo. Do not weaken branded payerId/methodId into strings. No need to re-export PaymentInfo because index.ts will export money.ts.
3. Use ISODate for CostBreakdown.date and CostRecord.servicePeriod.start/end; ISODateTime for Booking.datetime/bookedAt/cancellationDeadline, TripRun.startedAt/completedAt, ItemExecution.actualStart/actualEnd, Trigger absoluteTime.at. Aliases are strings, not runtime validation.
4. Preserve all already-correct fields and unions. Run scope validation, write accurate handoff, finish. Build check is permitted but integration is D's responsibility; do not claim it was forbidden when you didn't request build specifically.
