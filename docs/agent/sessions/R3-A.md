# R3-A Handoff — 원문 보존 migration (corrective)

## Summary
Applied the corrective task: the prior version produced only bookkeeping (provenance/report/idMap) and **no seed at all**. It also fabricated a note for `rakukanki` claiming "Booking created" while no Booking object was ever constructed. This version now constructs the full `MigrationSeed` (Workspace, TravelProject, PlanVersion, Place[], PlanItem[], Task[], Booking[]) and only claims in notes what the code actually creates.

## What changed
- `src/domain/migrations/migrate.ts` now returns `seed` matching `MigrationSeed` from `types.ts`.
- Deterministic ids: workspace/project/planVersion from fixed seed `kansai-2026`; PlanItem `plan-item:${legacyId}`; Task `task:${legacyId}`; Booking `booking:${legacyId}`; Place `place:${latR},${lngR}` (rounded to 5 decimals, deduped by coordinate).
- `Place[]` created only for events with valid lat/lng (43). Events without coordinates (seizen, bajitofu, kyorinsen, kanei, rakukanki, quattro) get no Place and no invented coordinates.
- `PlanItem[]` built for all 49 valid events with matching `type`/`detail.type` discriminated union, schedule from legacy start/end, places reference when a Place exists, bookingPolicy when reservation text present, status 'planned'.
- `Task[]` built for all 7 todos with status 'todo'.
- `Booking[]` created only when `isConfirmedReservation` is true AND a confident BookingType can be derived. In this dataset only `rakukanki` (food → restaurant, '예약 확정') qualifies; one Booking with status 'confirmed' is created and its id is listed in that ProvenanceEntry.newIds.
- Notes now only describe actual actions: `rakukanki` note says "Booking created with id 'booking:rakukanki'" and that id is genuinely present in `seed.bookings`. Ambiguous reservations say "No Booking created, original text preserved in BookingPolicy.note". Missing coordinates say "no Place created".
- No `any`, no whole-object casts, no weakening of `src/domain/*` types. `buildPlanItem` uses conditional spread to satisfy `exactOptionalPropertyTypes`.

## Validation results
- `scope`: PASS (exit 0).
- `migrationRun`: PASS (exit 0). Output: Events 49, Todos 7, Coordinates 43 bearing / 6 missing (seizen, bajitofu, kyorinsen, kanei, rakukanki, quattro). Report written to `docs/migration/KANSAI_REPORT.md`.
- Re-read `docs/migration/KANSAI_REPORT.md`: `rakukanki` row lists newIds `plan-item:rakukanki, booking:rakukanki` and note "Booking created with id 'booking:rakukanki'" — consistent with the seed. All 49 events + 7 todos appear exactly once in provenance; unresolved is empty. Day projections 2026-09-25..2026-10-01.

## Notes / caveats
- TravelProject status 'planning' and visibility 'private' are structural placeholders, not claims about the real project (stated in project.description).
- Price ranges and ambiguous reservation strings are preserved as text / BookingPolicy.note, not converted to Money or confirmed Bookings.
- Hotel check-in events are represented as single lodging PlanItems with schedule period, not duplicated per day.
- This batch only writes files; it does not touch the existing app, localStorage, or `src/data/trip.js` (read-only).
