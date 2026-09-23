# R1-A Handoff

## Summary
Implemented core domain types for Session A. Fixed PlanItem to be a true discriminated union with 10 branches. Added ShoppingDetail. Added required workspaceId to Place. Used ISODate/ISODateTime aliases for date/time fields.

## Files Modified
- `src/domain/ids.ts`: Branded IDs and ISO aliases.
- `src/domain/money.ts`: Money and PaymentInfo.
- `src/domain/workspace.ts`: Workspace.
- `src/domain/project.ts`: TravelProject with ISODate.
- `src/domain/place.ts`: Place (with required workspaceId) and PlaceReference.
- `src/domain/booking-policy.ts`: BookingPolicy.
- `src/domain/plan.ts`: PlanItem union, Details, Schedule, PlanVersion.

## Validation
- Scope validation passed.
- No runtime code or imports from existing app.
- Type-only modules.

## Risks
- None identified for this subtask.