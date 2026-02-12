$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$lockFile = Join-Path $projectRoot ".next\dev\lock"
$nextCmd = Join-Path $projectRoot "node_modules\.bin\next.cmd"
$port = 3001

Write-Host "Preparing clean Next.js dev startup..." -ForegroundColor Cyan

# Kill stale node processes started from this project that can keep .next/dev/lock alive.
$nodeProcesses = Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Where-Object {
  $_.CommandLine -and
  $_.CommandLine -like "*$projectRoot*" -and
  (
    $_.CommandLine -match "next(\.cmd)?\s+dev" -or
    $_.CommandLine -match "npm(\.cmd)?\s+run\s+dev" -or
    $_.CommandLine -match "start-server\.js" -or
    $_.CommandLine -match "\\.next\\dev\\"
  )
}

foreach ($proc in $nodeProcesses) {
  try {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
    Write-Host "Stopped stale dev process PID $($proc.ProcessId)" -ForegroundColor Yellow
  } catch {
    Write-Host "Could not stop PID $($proc.ProcessId): $($_.Exception.Message)" -ForegroundColor DarkYellow
  }
}

Start-Sleep -Milliseconds 300

if (Test-Path $lockFile) {
  Remove-Item $lockFile -Force
  Write-Host "Removed stale lock file: $lockFile" -ForegroundColor Yellow
}

if (!(Test-Path $nextCmd)) {
  throw "Next.js binary not found at $nextCmd. Run npm install first."
}

Write-Host "Starting Next.js on http://localhost:$port" -ForegroundColor Green
& $nextCmd dev -p $port
