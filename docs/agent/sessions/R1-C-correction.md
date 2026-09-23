# R1-C corrective task

The spec needs to be actionable, not only a phase summary table. Rewrite docs/EXECUTION_SPEC.md and ADR in KOREAN as originally requested. Preserve original roadmap body, translate only your two-line superseding notice into Korean with a working link to docs/EXECUTION_SPEC.md.

For EVERY R1-R10 phase include 1) concrete input 2) output files/modules (planned paths explicitly marked) 3) dependency 4) acceptance checks 5) failure/rollback behavior 6) session roles and nonoverlapping path ownership. Heavy R2/R3/R7/R8 <=2 sessions. Distinguish implementation vs independent test ownership, and sequential integration owner for shared config.

Must include a clear data source-of-truth policy: original src/data/trip.js remains read-only legacy source; versioned migration output + provenance report becomes initial seed; normalized new domain becomes new app truth after validation; selectors are derived only; existing trip.todo.done stays untouched until explicitly verified import, backup and new namespace are ready; no ongoing bidirectional legacy sync. Missing/invalid raw storage is preserved and recoverable.

New UI is separate entry (e.g. /platform/, planned not created). Existing entry stays usable and imports no new domain. New UI can reuse visual patterns but not forced legacy ViewModel adapter architecture. Routing/base paths for GitHub Pages need validation. Cutover in R9 is reversible and does NOT authorize deleting existing app, publishing, or user data replacement automatically. Keep old entry until explicit retirement decision.

R3 all 46 events need provenance, not necessarily 46 PlanItems: preserve six day projections, 40 coordinate-bearing occurrences/six unresolved IDs, all original time/price/reservation/note/query/prep/transport strings, eight todo ID/state mappings, idempotency, hotel semantic mapping and count differences report. No fabricated booking/price/route/place certainty. unresolved records must be reviewable, not silently discarded.

R6 must include OptionGroup/PlanFragment and change PREVIEW before COMMIT, with effects on timeline/map/bookings/cost/tasks. R7 deterministic input clock and no writes into actual plan/run; R8 explicit run lifecycle and planned-vs-actual separation. R10 public/private projection excludes confirmation codes, private payments, GPS history by default.

ADR must explicitly document ownership additions: Place.workspaceId; Booking/CostRecord/Task.projectId; Route/PlanFragment/PlanOption/OptionGroup/Scenario/Constraint.planVersionId. Also branded IDs, real type/detail union, minimal undefined detail variants, RouteLeg value object, Constraint subject restricted to PlanItem, ISO strings not runtime validation. Discuss tradeoff of building separate new UI versus incremental existing UI adapters, and limits of compile-time checks.

Accurate handoff: docs check only verifies files exist/nonempty; human/Codex reviews semantics. Do not claim Markdown lint or build or 'no risks' unless actually verified. A/B already executed concurrently. Current batch is R1 only; do not claim other phases completed.
