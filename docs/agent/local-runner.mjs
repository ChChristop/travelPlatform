// Bounded Local LLM coding runner: exact write ownership, read allowlist, fixed checks.
// Usage: node docs/agent/local-runner.mjs <batch> <session> [correctionPath]
//   e.g. node docs/agent/local-runner.mjs R1 D docs/agent/sessions/R1-D-correction.md
//        node docs/agent/local-runner.mjs R2 A1
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const batch = process.argv[2];
const session = process.argv[3];
const baseURL = process.env.LOCAL_LLM_BASE_URL;
if (!baseURL) throw new Error('Set LOCAL_LLM_BASE_URL in this process.');

const OWNERSHIP = {
  R1: {
    A: ['src/domain/ids.ts','src/domain/money.ts','src/domain/workspace.ts','src/domain/project.ts','src/domain/place.ts','src/domain/booking-policy.ts','src/domain/plan.ts'],
    B: ['src/domain/booking.ts','src/domain/cost.ts','src/domain/route.ts','src/domain/task.ts','src/domain/alternatives.ts','src/domain/scenario.ts','src/domain/run.ts'],
    C: ['docs/EXECUTION_SPEC.md','docs/decisions/ADR-0001-domain-first-rebuild.md','IMPLEMENTATION_ROADMAP.md'],
    D: ['src/domain/index.ts','tests/domain/contracts.type-test.ts','tsconfig.domain.json','package.json'],
  },
  R2: {
    A1: ['src/domain/validation/reference-rules.ts'],
    A2: ['src/domain/validation/value-rules.ts','src/store/entities/state.ts','src/store/entities/index.ts','tsconfig.runtime.json','package.json'],
    B: ['tests/domain/runtime/state.test.ts','tests/domain/runtime/validation.test.ts','tests/domain/runtime/fixtures.ts'],
  },
  R3: {
    A: ['src/domain/migrations/migrate.ts','src/domain/migrations/run.ts','src/domain/migrations/index.ts','docs/migration/KANSAI_REPORT.md'],
    B: ['fixtures/migrations/fixtures.ts','tests/migrations/migrate.test.ts','tests/migrations/idempotency.test.ts'],
  },
  R4: {
    A: ['src/store/selectors/timeline.ts','src/store/selectors/geo.ts','src/store/selectors/type.ts','src/store/selectors/index.ts','tests/selectors/timeline.test.ts','tests/selectors/geo.test.ts','tests/selectors/type.test.ts'],
    B: ['src/persistence/envelope.ts','src/persistence/storage.ts','src/persistence/index.ts','tests/persistence/persistence.test.ts'],
  },
  R5: {
    A: ['vite.config.js','platform/index.html','src/platform/main.jsx','src/platform/PlatformApp.jsx','src/platform/Shell.jsx','src/platform/ProjectSummary.jsx','src/platform/dataSource.js','src/platform/types.js','src/platform/platform.css','tests/platform/dataSource.test.ts'],
    B: ['src/platform/features/timeline/TimelineView.jsx','src/platform/features/timeline/TimelineView.css','tests/platform/timeline-helpers.test.ts'],
    C: ['src/platform/features/map/MapView.jsx','src/platform/features/map/MapView.css','src/platform/features/map/mapHelpers.js','tests/platform/map-helpers.test.ts'],
  },
};
const BATCH_EXTRA_COMMON = {
  R1: [],
  R2: ['src/domain/validation/errors.ts','docs/EXECUTION_SPEC.md'],
  R3: ['src/domain/migrations/types.ts','docs/EXECUTION_SPEC.md','src/data/trip.js'],
  R4: ['docs/EXECUTION_SPEC.md'],
  R5: ['docs/EXECUTION_SPEC.md','src/data/trip.js'],
};
const TEST_DIRS = {
  R2: 'tests/domain/runtime',
  R3: 'tests/migrations',
  R4: { A: 'tests/selectors', B: 'tests/persistence' },
  R5: 'tests/platform',
};
if (!OWNERSHIP[batch]) throw new Error(`Batch must be one of: ${Object.keys(OWNERSHIP).join(', ')}`);
const ownership = OWNERSHIP[batch];
if (!ownership[session]) throw new Error(`Session must be one of: ${Object.keys(ownership).join(', ')}`);

const handoff = `docs/agent/sessions/${batch}-${session}.md`;
const writable = new Set([...ownership[session], handoff]);
const common = ['docs/agent/CURRENT_TASK.md','docs/agent/CURRENT_ARCHITECTURE.md','travel-platform-domain-design.md','AGENT_WORKFLOW.md','package.json'];
const allHandoffs = Object.entries(OWNERSHIP).flatMap(([b, sessions]) => Object.keys(sessions).map(s => `docs/agent/sessions/${b}-${s}.md`));
const readable = new Set([
  ...common,
  ...(BATCH_EXTRA_COMMON[batch] ?? []),
  ...Object.values(OWNERSHIP).flatMap(sessions => Object.values(sessions).flat()),
  ...allHandoffs,
]);

const outDir = path.join(root,'docs/agent/sessions');
await fs.mkdir(outDir,{recursive:true});
const logPath = path.join(outDir,`${batch}-${session}.jsonl`);
const log = async data => fs.appendFile(logPath,JSON.stringify({at:new Date().toISOString(),...data})+'\n');
const safePath = async p => {
  if (typeof p !== 'string' || p.includes('\\') || path.isAbsolute(p) || p.split('/').includes('..')) throw new Error('Invalid relative path.');
  const full = path.resolve(root,p);
  let parent = path.dirname(full);
  while (true) { try { parent = await fs.realpath(parent); break; } catch (e) { if(e.code!=='ENOENT') throw e; parent=path.dirname(parent); } }
  if(parent!==root && !parent.startsWith(root+path.sep)) throw new Error('Parent escapes repository.');
  try { const stat=await fs.lstat(full); if(stat.isSymbolicLink()) throw new Error('Refuse symlink.'); } catch(e) { if(e.code!=='ENOENT') throw e; }
  return full;
};
const read = async p => { if(!readable.has(p)) throw new Error('Read outside task allowlist.'); return fs.readFile(await safePath(p),'utf8'); };
const run = (args) => new Promise(resolve => {
  const child=spawn(process.execPath,args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output=''; const collect=b=>{output+=b.toString();};
  child.stdout.on('data',collect); child.stderr.on('data',collect);
  child.on('error',e=>resolve({exitCode:null,output:e.message}));
  child.on('close',code=>resolve({exitCode:code,output:output.slice(-16000)}));
});
const existingTsFiles = async (list) => {
  const out = [];
  for (const p of list) {
    if (!p.endsWith('.ts')) continue;
    try { await fs.access(path.join(root,p)); out.push(p); } catch {}
  }
  return out;
};
const findRuntimeTestFiles = async () => {
  const entry = TEST_DIRS[batch];
  const dir = typeof entry === 'string' ? entry : entry?.[session];
  if (!dir) return [];
  try {
    const entries = await fs.readdir(path.join(root,dir));
    return entries.filter(f=>f.endsWith('.test.ts')).map(f=>`${dir}/${f}`);
  } catch { return []; }
};
const validations=[];
const consecutiveFailures = new Map();
let repeatedFailure = false;
async function validate(kind) {
  let result;
  if (batch === 'R1') {
    if(kind==='scope' && ['A','B'].includes(session)) {
      if(session==='B') {
        for(let n=0;n<30;n++) { try { await fs.access(path.join(root,'src/domain/ids.ts')); await fs.access(path.join(root,'src/domain/money.ts')); break; } catch { await new Promise(r=>setTimeout(r,2000)); } }
      }
      result=await run(['node_modules/typescript/bin/tsc','--noEmit','--strict','--exactOptionalPropertyTypes','--noUncheckedIndexedAccess','--target','ES2022','--module','ESNext','--moduleResolution','Bundler','--lib','ES2022',...ownership[session]]);
    } else if(kind==='domain' && session==='D') {
      result=await run(['node_modules/typescript/bin/tsc','-p','tsconfig.domain.json']);
    } else if(kind==='build') {
      result=await run(['node_modules/vite/bin/vite.js','build']);
    } else if(kind==='docs' && session==='C') {
      const sizes=await Promise.all(ownership.C.map(async p=>({path:p,characters:(await read(p)).length})));
      result={exitCode:sizes.every(x=>x.characters>100)?0:1,output:JSON.stringify(sizes)};
    } else throw new Error('Check not permitted for this session.');
  } else if (batch === 'R2' || batch === 'R3' || batch === 'R4' || batch === 'R5') {
    if (kind === 'scope') {
      // run.ts is a Node-runtime entrypoint (uses console/fs/path, needs .ts-extension relative
      // imports to execute under `node --experimental-strip-types`), not a portable type-only
      // domain module. Without @types/node it can never satisfy this strict tsc invocation
      // (missing console/node:fs/node:path globals) regardless of extension flags, so it is
      // verified by actually running it (migrationRun) instead, same principle as excluding test
      // files from the strict gate in R2 (see project memory: verify by execution when static
      // checking would need a new dependency).
      // Files under tests/** (and R3's Node-runtime run.ts) are verified by actually running them
      // (the 'runtime'/'migrationRun' kinds below), not by this strict tsc gate — see project
      // memory on why: no @types/node installed, so node:test/console/fs/path globals and
      // .test.ts files can never satisfy this invocation regardless of extension flags.
      const scopeFiles = ownership[session].filter(p => !p.startsWith('tests/') && p !== 'src/domain/migrations/run.ts');
      const files = await existingTsFiles(scopeFiles);
      if (files.length === 0) throw new Error('No existing .ts files owned by this session yet.');
      result = await run(['node_modules/typescript/bin/tsc','--noEmit','--strict','--exactOptionalPropertyTypes','--noUncheckedIndexedAccess','--allowImportingTsExtensions','--target','ES2022','--module','ESNext','--moduleResolution','Bundler','--lib','ES2022',...files]);
    } else if (kind === 'runtime') {
      const testFiles = await findRuntimeTestFiles();
      const testDirEntry = TEST_DIRS[batch];
      const testDir = typeof testDirEntry === 'string' ? testDirEntry : testDirEntry?.[session];
      if (testFiles.length === 0) throw new Error(`No ${testDir}/*.test.ts files found yet.`);
      result = await run(['--experimental-strip-types','--test',...testFiles]);
    } else if (kind === 'migrationRun' && batch === 'R3' && session === 'A') {
      const runPath = path.join(root,'src/domain/migrations/run.ts');
      try { await fs.access(runPath); } catch { throw new Error('src/domain/migrations/run.ts does not exist yet.'); }
      const exec = await run(['--experimental-strip-types','src/domain/migrations/run.ts']);
      if (exec.exitCode !== 0) { result = exec; }
      else {
        let reportLen = 0;
        try { reportLen = (await fs.readFile(path.join(root,'docs/migration/KANSAI_REPORT.md'),'utf8')).length; } catch {}
        result = reportLen > 200 ? exec : { exitCode: 1, output: exec.output + `\n[runner] docs/migration/KANSAI_REPORT.md missing or too short (${reportLen} chars) after running run.ts.` };
      }
    } else if (kind === 'build') {
      result = await run(['node_modules/vite/bin/vite.js','build']);
    } else throw new Error('Check not permitted for this session.');
  } else throw new Error('Unknown batch.');
  validations.push({kind,...result}); await log({validation:kind,...result});
  const previous=consecutiveFailures.get(kind);
  const count=result.exitCode!==0 && previous?.output===result.output ? previous.count+1 : result.exitCode!==0 ? 1 : 0;
  consecutiveFailures.set(kind,{output:result.output,count});
  if(count>=3) repeatedFailure=true;
  return result;
}
const modelResponse=await fetch(baseURL.replace(/\/$/,'')+'/models',{signal:AbortSignal.timeout(30000)});
if(!modelResponse.ok) throw new Error(`models HTTP ${modelResponse.status}`);
const models=await modelResponse.json();
if(models.data?.length!==1) throw new Error('Expected one discovered model; explicit selection required.');
const model=models.data[0].id;
await log({event:'start',batch,session,model,writeScope:[...writable]});
let context='';
for(const p of common) {
  let content=await read(p);
  if(p==='travel-platform-domain-design.md') content=[...content.matchAll(/```ts\r?\n([\s\S]*?)```/g)].map(m=>m[1]).join('\n\n');
  if(p==='AGENT_WORKFLOW.md') content='Local Qwen implements; Codex plans/reviews. Light tasks <=4 sessions, medium 2-3, heavy <=2. Never overlap writes. Follow CURRENT_TASK. Preserve user changes.';
  context+=`\nFILE ${p}\n${content}\n`;
}
for (const p of (BATCH_EXTRA_COMMON[batch] ?? [])) context+=`\nFILE ${p}\n${await read(p)}\n`;
if(batch==='R1' && session==='C') context+=`\nFILE IMPLEMENTATION_ROADMAP.md\n${await read('IMPLEMENTATION_ROADMAP.md')}`;
if(batch==='R1' && session==='D') for(const p of [...ownership.A,...ownership.B]) context+=`\nFILE ${p}\n${await read(p)}`;
if(batch==='R2') {
  const depFiles = session==='B' ? [...ownership.A1,...ownership.A2] : session==='A2' ? ownership.A1 : [];
  for(const p of depFiles) { try { context+=`\nFILE ${p}\n${await read(p)}`; } catch(e) { if(e.code!=='ENOENT') throw e; } }
}
if(batch==='R3') {
  const depFiles = session==='B' ? ownership.A : [];
  for(const p of depFiles) { try { context+=`\nFILE ${p}\n${await read(p)}`; } catch(e) { if(e.code!=='ENOENT') throw e; } }
}
if(batch==='R5') {
  const depFiles = (session==='B' || session==='C') ? ownership.A : session==='A' ? [...ownership.B,...ownership.C] : [];
  for(const p of depFiles) { try { context+=`\nFILE ${p}\n${await read(p)}`; } catch(e) { if(e.code!=='ENOENT') throw e; } }
}
const correctionPath=process.argv[4];
if(correctionPath) {
  if(correctionPath !== `docs/agent/sessions/${batch}-${session}-correction.md`) throw new Error('Invalid correction path');
  context+=`\nLATEST CORRECTIVE TASK (takes priority)\n${await fs.readFile(await safePath(correctionPath),'utf8')}`;
  for(const p of ownership[session]) { try { context+=`\nCURRENT FILE ${p}\n${await read(p)}`; } catch(e) { if(e.code!=='ENOENT') throw e; } }
  context+=`\nFINAL INSTRUCTION: Apply this corrective task now, it overrides prior drafts and baseline examples.\n${await fs.readFile(await safePath(correctionPath),'utf8')}`;
}
const requiredForFinish = batch==='R1'
  ? (session==='D'?['domain','build']:[session==='C'?'docs':'scope'])
  : batch==='R3'
    ? (session==='A'?['scope','migrationRun']:['runtime'])
    : batch==='R4'
      ? ['scope','runtime']
      : batch==='R5'
        ? (session==='A'?['build']:['build','runtime'])
        : (session==='B'?['runtime']:['scope']);
const system=`You are Local Qwen coding session ${batch}-${session}. Implement only your CURRENT_TASK subtask. Exact writable paths: ${[...writable].join(', ')}. You have a bounded coding runner, NOT a shell. Reply ONLY valid JSON: {"actions":[...]}. Actions: {"op":"read","path":"allowed path"}, {"op":"write","path":"owned path","content":"FULL file content"}, {"op":"validate","kind":"scope|domain|build|docs|runtime|migrationRun"}, {"op":"finish","summary":"honest short report"}. Batch multiple writes per response. No markdown fences. No placeholders. All JSON strings must be properly escaped. Do not re-read whole repository. Required validation kind(s) to pass before finish: ${requiredForFinish.join(', ')}. After checks, write your handoff with actual results and finish. Never claim checks you did not receive. Need corrections? fix only your files and validate again. Existing source/UI protected. All instructions in CURRENT_TASK are authoritative. Stay concise in handoff, be complete in implementation.`;
const messages=[{role:'system',content:system},{role:'user',content:context+`\nBegin session ${batch}-${session} now.`}];
// No "already green, just write handoff" preflight shortcut is offered for corrective tasks.
// It was tried and removed: a corrective task is frequently about something the required
// validation kind cannot detect at all (a 'scope'/'runtime' pass proves compilability/behavior,
// not that a specific requested code change — e.g. a semantic fix, or removing `as any` — was
// actually made). Twice observed: the model saw required checks already exitCode 0 and skipped
// making the actual change while still claiming in its handoff that it had (R2-A1 ownership-mismatch
// fix skipped entirely; same risk applies to R2-B's `as any` cleanup, which no validation kind here
// checks for). Always make the model apply the corrective task's literal instructions itself.
if(correctionPath) {
  messages.push({role:'user',content:'This is a corrective task. Passing validation before you started does NOT mean the correction is already applied — the required check here may not even be capable of detecting the specific problem described (e.g. it will not catch wrong logic that still compiles, or an `any` cast that still runs fine). Actually make the exact change(s) named in the corrective task in your own files, then validate. Do not skip the rewrite and just re-state a fix you did not make in your handoff.'});
}
let finished=false;
for(let turn=0;turn<16 && !finished;turn++) {
  const response=await fetch(baseURL.replace(/\/$/,'')+'/chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(300000),
    body:JSON.stringify({model,messages,temperature:0.1,max_tokens:16000,chat_template_kwargs:{enable_thinking:false}})
  });
  if(!response.ok) throw new Error(`completion HTTP ${response.status}: ${(await response.text()).slice(0,500)}`);
  const data=await response.json(); const content=data.choices?.[0]?.message?.content;
  await log({turn,finishReason:data.choices?.[0]?.finish_reason,usage:data.usage});
  if(!content) throw new Error('Model returned no content.');
  let batchActions;
  try { batchActions=JSON.parse(content.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')); } catch {
    messages.push({role:'user',content:'Your response was not valid JSON. Return the same intended actions as properly escaped JSON only, with fewer files per response.'}); continue;
  }
  if(!Array.isArray(batchActions.actions)) throw new Error('Expected actions array.');
  messages.push({role:'assistant',content});
  const results=[];
  for(const a of batchActions.actions) {
    try {
      if(a.op==='read') results.push({op:a.op,path:a.path,content:await read(a.path)});
      else if(a.op==='write') {
        if(!writable.has(a.path)||typeof a.content!=='string') throw new Error('Write outside exact ownership.');
        const full=await safePath(a.path); await fs.mkdir(path.dirname(full),{recursive:true}); await fs.writeFile(full,a.content,'utf8');
        await log({write:a.path,characters:a.content.length}); results.push({op:a.op,path:a.path,result:'saved'});
      } else if(a.op==='validate') results.push({op:a.op,kind:a.kind,...await validate(a.kind)});
      else if(a.op==='finish') {
        if(!requiredForFinish.every(k=>validations.findLast(v=>v.kind===k)?.exitCode===0)) throw new Error('Required validation not yet passed. Fix or report inability; cannot finish PASS.');
        await fs.access(path.join(root,handoff));
        finished=true; await log({event:'finish',summary:a.summary}); console.log(`Session ${batch}-${session} complete: ${a.summary}`); break;
      } else throw new Error('Unknown action.');
    } catch(e) { results.push({op:a.op,error:e.message}); await log({actionError:e.message,op:a.op}); }
  }
  if(!finished && results.some(r=>r.op==='write') && !results.some(r=>r.op==='validate')) {
    const kind=requiredForFinish[0];
    try { results.push({op:'validate',kind,automatic:true,...await validate(kind)}); }
    catch(e) { results.push({op:'validate',kind,automatic:true,error:e.message}); await log({actionError:e.message,op:'validate',kind}); }
    if(requiredForFinish.length>1 && results.at(-1).exitCode===0) {
      const kind2=requiredForFinish[1];
      try { results.push({op:'validate',kind:kind2,automatic:true,...await validate(kind2)}); }
      catch(e) { results.push({op:'validate',kind:kind2,automatic:true,error:e.message}); await log({actionError:e.message,op:'validate',kind:kind2}); }
    }
  }
  if(!finished) messages.push({role:'user',content:JSON.stringify({results,remainingTurns:15-turn})+'\nNext: fix only reported failures; if required validations passed, write accurate handoff then finish. Do not rewrite unchanged files.'});
  if(repeatedFailure) { await log({event:'escalation',reason:'Same validation failure three times; Codex corrective task required.'}); break; }
}
await fs.writeFile(path.join(outDir,`${batch}-${session}-validation.json`),JSON.stringify({batch,session,finished,validations},null,2));
if(!finished) throw new Error(repeatedFailure ? 'Repeated validation failure: escalated to Codex. See session log.' : 'Session budget exhausted; see logs and handoff.');
