# R1-D targeted corrective task

Do not rewrite the same failing file unchanged. Compiler says expect-error directives are placed on the wrong lines and one test casts away the error.

## @ts-expect-error placement rule (read this first, it is why prior attempts failed)

TypeScript anchors a diagnostic to different lines depending on the error kind. `@ts-expect-error` only suppresses an error reported on the very next line, so you must know which line TS actually reports before placing it:

- Missing required property (TS2741, e.g. "Property 'workspaceId' is missing in type ... but required in type 'Place'"): TS reports this at the **`const x: T = {` declaration line itself**, not at any line inside the object body. Put the directive immediately above that `const` line. Putting it above the last property inside the object body does NOT work — it produces BOTH the original TS2741 (still uncaught, since the directive is on the wrong line) AND a separate "Unused '@ts-expect-error' directive" (TS2578) on the comment's own line, because no error occurs where you put it.
- Wrong value for a specific known field (e.g. assigning `detail: { type: 'meal' }` where `type: 'lodging'` is expected, or assigning one branded ID type to another): TS reports this at that specific property's line inside the object. Put the directive immediately above that property line.
- Wrong literal assigned directly to a typed variable (e.g. `status: 'invalidStatus'` on its own field): same as above — directive goes immediately above that field's line, not above the enclosing `const`.

Rule of thumb: if the object literal is missing a whole property, the error belongs to the declaration line. If the object literal has a property but its value is the wrong type, the error belongs to that property's line. Never guess — after writing, run the domain check and read the exact `(line,col)` in the diagnostic; move the directive to exactly one line above that reported line, remove any directive that produced "Unused '@ts-expect-error' directive", and re-validate before finishing.

Keep all positive fixtures and index/config/package scripts. Change these specific negative cases:
1. invalidPlaceRef: move @ts-expect-error INSIDE object immediately before `placeId: planItemId`. Remove directive before const.
2. invalidBookingRef: move directive immediately before `id: bookingId` inside object. Remove directive before const.
3. invalidBookingAsPolicy: remove `as unknown as Booking` entirely. Define `const policy: BookingPolicy = { availability:'available', requirement:'required' };` then `// @ts-expect-error policy is not an actual Booking` immediately followed by `const invalidBookingAsPolicy: Booking = policy;`. No double casts.
4. invalidTripRun and invalidItemExecution: directive immediately before `status: 'invalidStatus'` INSIDE object, not before const.
5. Add ownership negative cases using destructuring of valid fixtures: Place without workspaceId, Booking without projectId, CostRecord without projectId must be rejected. Also positive Booking/CostRecord objects include correct IDs and shared PaymentInfo. Do not weaken source types or use `any`/whole-object casts. These three are missing-required-property errors (TS2741), so per the placement rule above, the `@ts-expect-error` directive goes immediately above each `const invalidPlace/invalidBooking/invalidCostRecord: T = {` declaration line, NOT above a property inside the object body.
6. Optional: remove unrelated unused import/void boilerplate to keep tests readable. Do not change A/B files.
7. Run domain check. If unused directive remains, read exact diagnostic and move it to the line diagnostic names. A directive only applies to the NEXT source line. Then build. Write honest handoff and finish.

This is STATIC contract testing, not runtime test suite. Protect original app; its removal requires later explicit user confirmation.
