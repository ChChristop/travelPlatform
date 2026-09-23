// Read-only local LLM audit: compare travel-platform-domain-design.md against src/domain/*.ts.
// Modeled on invoke-audit.ps1 (one-shot, no bounded action loop) but scoped to the R1 domain types.
// Writes ONLY docs/agent/sessions/R1-design-audit.md. No source files are touched.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baseURL = process.env.LOCAL_LLM_BASE_URL;
if (!baseURL) throw new Error('Set LOCAL_LLM_BASE_URL in this process.');

const domainFiles = [
  'src/domain/ids.ts','src/domain/money.ts','src/domain/workspace.ts','src/domain/project.ts',
  'src/domain/place.ts','src/domain/booking-policy.ts','src/domain/plan.ts','src/domain/booking.ts',
  'src/domain/cost.ts','src/domain/route.ts','src/domain/task.ts','src/domain/alternatives.ts',
  'src/domain/scenario.ts','src/domain/run.ts','src/domain/index.ts'
];
const contextFiles = [
  'travel-platform-domain-design.md',
  'docs/decisions/ADR-0001-domain-first-rebuild.md',
  'docs/agent/CURRENT_TASK.md',
  ...domainFiles
];

const withLineNumbers = async (p) => {
  const content = await fs.readFile(path.join(root, p), 'utf8');
  const lines = content.split(/\r?\n/);
  return `FILE: ${p}\n` + lines.map((l, i) => `${i + 1}: ${l}`).join('\n');
};

const modelResponse = await fetch(baseURL.replace(/\/$/, '') + '/models', { signal: AbortSignal.timeout(30000) });
if (!modelResponse.ok) throw new Error(`models HTTP ${modelResponse.status}`);
const models = await modelResponse.json();
if (models.data?.length !== 1) throw new Error('Expected one discovered model; explicit selection required.');
const model = models.data[0].id;

const context = (await Promise.all(contextFiles.map(withLineNumbers))).join('\n\n');

const prompt = `You are the Local Qwen design-conformance auditor for the R1 domain-types batch. You are read-only: you do not write code, only a report.
Compare travel-platform-domain-design.md (source-of-truth field/enum spec) against the current src/domain/*.ts implementation, field by field and enum-member by enum-member, for every entity: Workspace, TravelProject, Place/PlaceReference, PlanVersion, PlanItem (all 10 type/detail variants), BookingPolicy, Booking, CostRecord/CostBreakdown/CostSubject, Route/RouteLeg, Task/Trigger, PlanFragment/PlanOption/OptionGroup, Scenario/Constraint, TripRun/ItemExecution, Money/PaymentInfo.
docs/decisions/ADR-0001-domain-first-rebuild.md and docs/agent/CURRENT_TASK.md document INTENTIONAL additions/simplifications versus the raw design doc (branded IDs, Place.workspaceId, Booking/CostRecord/Task.projectId, Route/PlanFragment/PlanOption/OptionGroup/Scenario/Constraint.planVersionId, PlanItem.routeIds, minimal non-lodging Detail variants, RouteLeg as a value object not an entity, Constraint.subjectId narrowed to PlanItemId, Scenario.variables/Constraint.value/Route.geometry typed unknown). Do NOT flag these as bugs — they are approved deviations. Only flag: (a) a field or enum member the design doc requires that is actually MISSING from src/domain, (b) a field with wrong required/optional-ness or wrong branded ID type versus the design doc, (c) an invented field/enum member not grounded in the design doc AND not one of the approved ADR-0001 additions listed above.
Reply ONLY valid JSON, no markdown fences: {"report": "<Korean Markdown report>"}. The report must: for each entity, state MATCH or list concrete discrepancies citing design-doc line number and src/domain file:line. End with a one-line verdict: 결함 없음, or a count of discrepancies found. Be precise and concrete — do not restate the whole design doc, only cite what's needed to justify each discrepancy claim.`;

const body = {
  model,
  messages: [{ role: 'user', content: prompt + '\n\n' + context }],
  temperature: 0.1,
  max_tokens: 20000,
  chat_template_kwargs: { enable_thinking: false }
};

const response = await fetch(baseURL.replace(/\/$/, '') + '/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  signal: AbortSignal.timeout(600000),
  body: JSON.stringify(body)
});
if (!response.ok) throw new Error(`completion HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
const data = await response.json();
const content = data.choices?.[0]?.message?.content;
if (!content) throw new Error(`No content. finish_reason=${data.choices?.[0]?.finish_reason} usage=${JSON.stringify(data.usage)}`);
const cleaned = content.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
const result = JSON.parse(cleaned);
if (!result.report) throw new Error('Missing report field in model output.');

const outPath = path.join(root, 'docs/agent/sessions/R1-design-audit.md');
await fs.writeFile(outPath, result.report, 'utf8');
console.log(`Audit written to docs/agent/sessions/R1-design-audit.md (model: ${model})`);
