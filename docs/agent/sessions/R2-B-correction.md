# R2-B corrective task

Your fixtures.ts and both test files cast every branded ID literal as `any` (`'proj-1' as any`, `'pi-1' as any`, etc — 36 occurrences total across the 3 files). CURRENT_TASK.md explicitly forbids this: "`any` 사용 금지, 전체 객체 캐스팅으로 타입 검사 우회 금지." `as any` defeats the entire point of branded IDs — it silently allows any string to be assigned to any ID field, which is exactly what R1's branded ID design was built to prevent.

Fix: import the specific branded ID type aliases you need from `../../../src/domain` (e.g. `ProjectId`, `WorkspaceId`, `PlanVersionId`, `PlanItemId`, `PlaceId`, `CostRecordId`, `OptionGroupId`, `PlanOptionId`, `PlanFragmentId`, `TripRunId`, `ItemExecutionId` — whichever your fixtures actually use), and cast each literal to its own specific type: `'proj-1' as ProjectId`, `'pi-1' as PlanItemId`, etc. This is exactly the pattern already used in `tests/domain/contracts.type-test.ts` from the R1 batch (look at its "Branded ID fixtures" section near the top for the established convention) — follow it, don't invent a new one.

Do not use a single shared `as any` or a generic `as string as X` double-cast. Each literal gets cast directly to the one specific branded type it represents. Do not weaken `StateFactoryInput`/`ReferenceEntities`/`ValueRuleInput` or any src/domain type to accommodate this — the fix is entirely in your own fixture/test files.

After fixing, run `runtime` validation and confirm all tests still pass (they test behavior, not the cast mechanism, so this change should not need any assertion changes). Write an accurate handoff and finish.
