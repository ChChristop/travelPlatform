# R2-A1 corrective task

Your `checkOwnership` in `src/domain/validation/reference-rules.ts` does not actually check ownership. It only checks that `PlanVersion.projectId` is truthy (non-empty string), which every valid fixture will always satisfy — this can never catch a real mismatch, and your own inline comments show you talked yourself out of the real check ("Let's assume the input includes a set of valid project IDs...", "the simplest check is: if the PlanVersion exists, its projectId is valid"). Delete all of that reasoning-trail commentary and replace the function with a real cross-entity check.

Real check to implement: `CostRecord` already has a required `projectId` field (imported from `../cost`), and `PlanVersion` already has a required `projectId` field. For every `CostRecord` whose `subject.type === 'planItem'`:
1. Look up the referenced `PlanItem` by `subject.id` in `entities.planItems`.
2. If found, look up that `PlanItem`'s `PlanVersion` by `planItem.planVersionId` in `entities.planVersions`.
3. If that `PlanVersion` is found, compare its `projectId` to the `CostRecord`'s own `projectId`. If they differ, push a `'ownership-mismatch'` error citing the `CostRecord`'s id, entityType `'CostRecord'`, and a message naming both project ids and the plan item id in between.

Do not flag anything when the `PlanItem` or `PlanVersion` lookup itself fails — that is already reported by `checkCostRecordSubjects`/`checkPlanItemReferences` as a dangling reference; ownership-mismatch is only about two projectIds actually disagreeing when both entities exist.

Update `ReferenceEntities`/`validateReferenceRules` signature only if strictly needed (it already receives `costRecords` and `planVersions`, so no new input fields should be required). Keep all other rules (duplicate ID, place reference, cost record subject, plan item→plan version reference) exactly as they are — they are correct.

Remove the entire block of exploratory "Let's assume / Actually, the task says / For now, we check..." comments in the file — none of that reasoning belongs in the final code. Run `scope` validation, write an accurate handoff (state plainly what changed and why the old check was wrong), then finish.
