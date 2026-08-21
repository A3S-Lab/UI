[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$pidFile = Join-Path $projectRoot '.a3s-form\playground.pid'
if (-not (Test-Path -LiteralPath $pidFile)) {
  Write-Host 'No A3S Form local server PID was found.'
  exit 0
}

$serverPid = [int](Get-Content -LiteralPath $pidFile -Raw)
$process = Get-CimInstance Win32_Process -Filter "ProcessId = $serverPid" -ErrorAction SilentlyContinue
if ($process -and $process.CommandLine -like '*scripts/serve-playground.mjs*') {
  Stop-Process -Id $serverPid
  Write-Host "Stopped the A3S Form local server (PID $serverPid)."
} else {
  Write-Host 'The PID is stale or does not belong to A3S Form; no process was stopped.'
}
Remove-Item -LiteralPath $pidFile -Force
