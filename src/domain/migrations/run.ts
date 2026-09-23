import { migrate } from './migrate.ts';
import { events, todos } from '../../data/trip.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const input = {
  events: events as any[],
  todos: todos as any[]
};

const result = migrate(input);

const reportDir = 'docs/migration';
const reportPath = `${reportDir}/KANSAI_REPORT.md`;

mkdirSync(reportDir, { recursive: true });

let md = `# Kansai Trip Migration Report\n\n`;
md += `Generated at: ${result.report.generatedAt}\n`;
md += `Input Hash: ${result.report.inputHash}\n`;
md += `Plan Version ID: ${result.planVersionId}\n\n`;

md += `## Summary\n\n`;
md += `- Total Legacy Events: ${result.report.totalLegacyEvents}\n`;
md += `- Total Legacy Todos: ${result.report.totalLegacyTodos}\n`;
md += `- Coordinate Bearing Count: ${result.report.coordinateBearingCount}\n`;
md += `- Missing Coordinate IDs: ${result.report.missingCoordinateIds.length}\n`;
md += `  - ${result.report.missingCoordinateIds.join(', ')}\n`;
md += `- Day Projections: ${result.report.dayProjections.join(', ')}\n\n`;

md += `## Provenance\n\n`;
md += `| Legacy ID | Kind | New IDs | Action | Note |\n`;
md += `|---|---|---|---|---|\n`;
for (const p of result.report.provenance) {
  const note = p.note.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  md += `| ${p.legacyId} | ${p.legacyKind} | ${p.newIds.join(', ')} | ${p.action} | ${note} |\n`;
}

md += `\n## Unresolved\n\n`;
if (result.report.unresolved.length === 0) {
  md += `None.\n`;
} else {
  md += `| Legacy ID | Kind | Reason |\n`;
  md += `|---|---|---|\n`;
  for (const u of result.report.unresolved) {
    const reason = u.reason.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    md += `| ${u.legacyId} | ${u.legacyKind} | ${reason} |\n`;
  }
}

md += `\n## ID Map\n\n`;
md += `| Legacy ID | New ID |\n`;
md += `|---|---|\n`;
for (const [legacy, newId] of Object.entries(result.idMap)) {
  md += `| ${legacy} | ${newId} |\n`;
}

writeFileSync(reportPath, md, 'utf-8');

console.log(`Migration complete. Report written to ${reportPath}`);
console.log(`Events: ${result.report.totalLegacyEvents}, Todos: ${result.report.totalLegacyTodos}`);
console.log(`Coordinates: ${result.report.coordinateBearingCount} bearing, ${result.report.missingCoordinateIds.length} missing`);
console.log(`Missing: ${result.report.missingCoordinateIds.join(', ')}`);
