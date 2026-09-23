# R1-A corrective task (latest authoritative instruction)

Your previous claim of a discriminated union was false. plan.ts exports an interface with unrelated type and detail unions; this accepts mismatches and omits ShoppingDetail. Fix your own files only:
1. Export ShoppingDetail { type: 'shopping' }, include it in PlanItemDetail.
2. Export PlanItem as a true union: common fields intersected with ten branches, each {type:'lodging';detail:LodgingDetail}, {type:'meal';detail:MealDetail}, etc. Never use type:PlanItemType and detail:PlanItemDetail as independent fields. A mapped union also works. All ten type branches required.
3. Place.workspaceId: WorkspaceId is REQUIRED per CURRENT_TASK. Import that branded ID from ids.ts.
4. Use ISODate/ISODateTime aliases for date/date-time fields in your modules (they are strings, not runtime validators). Keep checkInTime/checkOutTime as wall-clock strings.
5. Run scope validation, update handoff accurately, finish. No other session files.
