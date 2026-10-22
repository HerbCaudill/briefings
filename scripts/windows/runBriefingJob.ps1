param([Parameter(Mandatory)][ValidateSet('morning','inbox','research')][string]$Job)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$env:Path = "$env:USERPROFILE/AppData/Local/mise/shims;$env:USERPROFILE/.local/bin;" + [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
$env:TZ = 'Europe/Madrid'
$env:TASKS_SPACE_ID = 'B7CSO2L6KYNN4HZBSBNHP3LC3SA7PYNJO'
$env:TASKS_FRESHNESS = 'converged'
$state = Join-Path $env:USERPROFILE '.local/state/morning-briefing'
if ($Job -ne 'morning') { $state = Join-Path $env:USERPROFILE '.local/state/inbox-processing' }
if (-not (Test-Path -LiteralPath $state -PathType Container)) { throw 'Install protected briefing state first.' }
$node = (& mise.exe which node).Trim()
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $node)) { throw 'No configured mise Node runtime.' }
Set-Location -LiteralPath $repo
$entry = if ($Job -eq 'morning') { 'scripts/morning-briefing/run.ts' } else { 'scripts/inbox/run.ts' }
$arguments = @('--import','tsx',$entry)
if ($Job -eq 'research') { $arguments += '--research-worker' }
& $node @arguments *>> (Join-Path $state "$Job.log")
exit $LASTEXITCODE
