param(
  [Parameter(Mandatory=$true)][string]$BaseUrl
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location -LiteralPath $repo
$models = Invoke-RestMethod -Uri ($BaseUrl.TrimEnd('/') + '/models') -TimeoutSec 30
if ($models.data.Count -ne 1) { throw 'Expected one model; explicitly select from discovered models before continuing.' }
$modelId = $models.data[0].id
$paths = @('README.md','travel-platform-domain-design.md','IMPLEMENTATION_ROADMAP.md','AGENT_WORKFLOW.md','docs/agent/CURRENT_TASK.md','package.json','vite.config.js','index.html','.gitignore')
$paths += @(Get-ChildItem src -Recurse -File | ForEach-Object { [IO.Path]::GetRelativePath($repo, $_.FullName) })
if (Test-Path 'docs/agent/REVIEW_CORRECTIONS.md') { $paths += @('docs/agent/CURRENT_ARCHITECTURE.md','docs/agent/WORKLOG.md','docs/agent/REVIEW_CORRECTIONS.md') }
$context = foreach ($path in $paths) {
  $line = 0
  "FILE: $path"
  Get-Content -LiteralPath $path | ForEach-Object { $line++; "${line}: $_" }
}
$prompt = @'
You are the Local Qwen repository audit author. Follow CURRENT_TASK.md only. Analyze the actual source supplied with line numbers. Return ONLY a JSON object with string properties architecture and handoff, containing complete Korean Markdown documents. Do not output code fences around JSON. Cover all required topics with precise source references, actual schemas and behavior, known limitations, migration adapter recommendations. Distinguish planned features from implemented ones. No application changes. Do not claim to execute commands: Codex executed validation as runner. Evidence: initial git status clean; HEAD d0ca7f5baea901501f8cd343f93fa02653b6be80. npm install succeeded (44 added, 69 audited, zero vulnerabilities). npm build result will be independently appended by Codex. package has no lint/test scripts. No .github workflow in repository. OpenCode desktop installed but CLI unavailable on PATH. This is a direct API delegated audit, not an OpenCode agent run. Source documents exist at repository root, not requested docs paths. Do not start Phase 1. Be thorough but concrete, avoid repeating target-design document. Pay attention to current/next vs upcoming semantics, timezone, data-to-UI dependency, date grouping, missing coordinates, unused presentation values, and localStorage error handling.
'@
$body = @{model=$modelId; messages=@(@{role='user';content=$prompt + "`n" + ($context -join "`n")}); temperature=0.1; max_tokens=20000; chat_template_kwargs=@{enable_thinking=$false}} | ConvertTo-Json -Depth 8
$response = Invoke-RestMethod -Uri ($BaseUrl.TrimEnd('/') + '/chat/completions') -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 600
if (-not $response.choices[0].message.content) { throw ('No content. Finish reason: ' + $response.choices[0].finish_reason + '; usage: ' + ($response.usage | ConvertTo-Json -Compress)) }
$content = $response.choices[0].message.content.Trim()
$content = $content -replace '^```json\s*','' -replace '\s*```$',''
$result = $content | ConvertFrom-Json
if (-not $result.architecture -or -not $result.handoff) { throw 'Missing required audit documents' }
Set-Content -LiteralPath (Join-Path $PSScriptRoot 'CURRENT_ARCHITECTURE.md') -Value $result.architecture -Encoding utf8
Set-Content -LiteralPath (Join-Path $PSScriptRoot 'HANDOFF.md') -Value $result.handoff -Encoding utf8
Write-Output "Local audit complete. Model discovered: $modelId"
