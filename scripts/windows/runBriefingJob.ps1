param([Parameter(Mandatory)][ValidateSet('morning','inbox','research','heartbeat')][string]$Job)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$env:Path = "$env:USERPROFILE/AppData/Local/mise/shims;$env:USERPROFILE/.local/bin;" + [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
$env:TZ = 'Europe/Madrid'
$env:TASKS_SPACE_ID = 'B7CSO2L6KYNN4HZBSBNHP3LC3SA7PYNJO'
$env:TASKS_FRESHNESS = 'converged'
$state = Join-Path $env:USERPROFILE '.local/state/morning-briefing'
if ($Job -in 'inbox','research') { $state = Join-Path $env:USERPROFILE '.local/state/inbox-processing' }
if ($Job -eq 'heartbeat') { $state = Join-Path $env:USERPROFILE '.local/state/leo'; New-Item -ItemType Directory -Force -Path $state | Out-Null }
if (-not (Test-Path -LiteralPath $state -PathType Container)) { throw 'Install protected briefing state first.' }
$node = (& mise.exe which node).Trim()
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $node)) { throw 'No configured mise Node runtime.' }
Set-Location -LiteralPath $repo
if ($Job -eq 'morning') {
  # Diagnose page responsiveness without preventing the other briefing sources from running.
  & $node --experimental-strip-types 'scripts/morning-briefing/checkAgentChrome.ts' *>> (Join-Path $state "$Job.log")
}
$entry = switch ($Job) { 'morning' { 'scripts/morning-briefing/run.ts' } 'heartbeat' { 'scripts/heartbeat/run.ts' } default { 'scripts/inbox/run.ts' } }
$arguments = @('--experimental-strip-types',$entry)
if ($Job -eq 'research') { $arguments += '--research-worker' }
& $node @arguments *>> (Join-Path $state "$Job.log")
exit $LASTEXITCODE
