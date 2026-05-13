# Starts the Vidlancing backend and frontend dev servers.
# Run from PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\start-dev.ps1

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "vid"
$FrontendDir = Join-Path $Root "vid-frontend"
$LogDir = Join-Path $Root ".dev-logs"

$BackendPort = 3000
$FrontendPort = 5173
$CmdExe = $env:ComSpec
if (-not $CmdExe) {
  $CmdExe = Join-Path $env:SystemRoot "System32\cmd.exe"
}

function Test-PortInUse {
  param([int]$Port)

  $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  return $null -ne $conn
}

function Wait-ForPort {
  param(
    [int]$Port,
    [string]$Name,
    [int]$TimeoutSeconds = 45
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortInUse -Port $Port) {
      Write-Host "OK: $Name is listening on port $Port" -ForegroundColor Green
      return $true
    }
    Start-Sleep -Milliseconds 700
  }

  Write-Host "WARN: $Name did not start listening on port $Port within $TimeoutSeconds seconds." -ForegroundColor Yellow
  return $false
}

function Start-DevProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command,
    [string]$LogName
  )

  if (-not (Test-Path -LiteralPath $WorkingDirectory)) {
    throw "Directory not found: $WorkingDirectory"
  }

  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  $logFile = Join-Path $LogDir $LogName
  $cmd = "/d /s /c `"$Command >> `"$logFile`" 2>>&1`""
  $process = Start-Process -FilePath $CmdExe -ArgumentList $cmd -WorkingDirectory $WorkingDirectory -WindowStyle Minimized -PassThru

  Write-Host "Started $Name (PID $($process.Id)). Log: $logFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting Vidlancing dev servers..." -ForegroundColor Cyan
Write-Host "Project root: $Root"
Write-Host ""

if (Test-PortInUse -Port $BackendPort) {
  Write-Host "Backend port $BackendPort is already in use. Skipping backend start." -ForegroundColor Yellow
} else {
  Start-DevProcess -Name "Backend" -WorkingDirectory $BackendDir -Command "npm run dev" -LogName "backend.log"
}

if (Test-PortInUse -Port $FrontendPort) {
  Write-Host "Frontend port $FrontendPort is already in use. Skipping frontend start." -ForegroundColor Yellow
} else {
  Start-DevProcess -Name "Frontend" -WorkingDirectory $FrontendDir -Command "npm run dev -- --host 0.0.0.0" -LogName "frontend.log"
}

Write-Host ""
Write-Host "Waiting for servers..."
$backendReady = Wait-ForPort -Port $BackendPort -Name "Backend"
$frontendReady = Wait-ForPort -Port $FrontendPort -Name "Frontend"

Write-Host ""
Write-Host "Vidlancing links" -ForegroundColor Cyan
Write-Host "Frontend:    http://localhost:$FrontendPort" -ForegroundColor Green
Write-Host "Backend API: http://localhost:$BackendPort/api/v1" -ForegroundColor Green
Write-Host "Backend:     http://localhost:$BackendPort" -ForegroundColor Green

if ($frontendReady) {
  try {
    Start-Process "http://localhost:$FrontendPort"
  } catch {
    Write-Host "Could not open browser automatically. Open the frontend URL manually." -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "Logs are stored in: $LogDir" -ForegroundColor Gray
Write-Host "To stop later: close the node processes using ports $BackendPort and $FrontendPort, or restart your terminal session." -ForegroundColor Gray

if (-not ($backendReady -and $frontendReady)) {
  exit 1
}
