[CmdletBinding()]
param(
  [ValidateRange(1, 65535)]
  [int]$Port = 4176,
  [switch]$NoStart
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot '..\..')).Path
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw 'Node.js 20 or newer was not found.'
}
$arguments = @((Join-Path $projectRoot 'scripts\deploy.mjs'), '--port', [string]$Port, '--no-start')
Push-Location $repositoryRoot
try {
  & $node.Source @arguments
  if ($LASTEXITCODE -ne 0) { throw "Deployment failed with exit code $LASTEXITCODE." }
} finally {
  Pop-Location
}

if ($NoStart) { return }

function Test-A3SFormHealth {
  try {
    $response = Invoke-RestMethod -UseBasicParsing -Uri "http://127.0.0.1:$Port/.well-known/a3s-health" -TimeoutSec 2
    return $response.ok -eq $true -and $response.service -eq 'a3s-form-playground'
  } catch {
    return $false
  }
}

if (Test-A3SFormHealth) {
  Write-Host "A3S Form is already running: http://127.0.0.1:$Port"
  return
}

$runtimeRoot = Join-Path $projectRoot '.a3s-form'
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
$stdoutPath = Join-Path $runtimeRoot 'playground.out.log'
$stderrPath = Join-Path $runtimeRoot 'playground.err.log'
$pidPath = Join-Path $runtimeRoot 'playground.pid'
$previousPid = if (Test-Path -LiteralPath $pidPath) { Get-Content -LiteralPath $pidPath -Raw } else { $null }
if ($previousPid -and (Get-Process -Id ([int]$previousPid) -ErrorAction SilentlyContinue)) {
  throw "A stale A3S Form process is still running with PID $previousPid. Use scripts\stop.ps1 first."
}

$server = Start-Process `
  -FilePath $node.Source `
  -ArgumentList (Join-Path $projectRoot 'scripts\serve-playground.mjs') `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutPath `
  -RedirectStandardError $stderrPath `
  -PassThru
Set-Content -LiteralPath $pidPath -Value $server.Id -Encoding Ascii

$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
  Start-Sleep -Milliseconds 200
  if ($server.HasExited) { break }
  if (Test-A3SFormHealth) {
    $ready = $true
    break
  }
}
if (-not $ready) {
  if (-not $server.HasExited) { Stop-Process -Id $server.Id }
  throw "The playground did not start. Review $stderrPath"
}

Write-Host "Deployment complete: http://127.0.0.1:$Port"
Write-Host "The local service is running in a hidden process (PID $($server.Id))."
