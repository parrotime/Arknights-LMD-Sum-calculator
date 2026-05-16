param(
  [int]$Port = 3002,
  [int]$WorkerPoolSize = 1,
  [int]$ProcessorAffinity = 3
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$backendDir = Join-Path $repoRoot "backend"

$env:NODE_ENV = "test"
$env:PORT = [string]$Port
$env:WORKER_POOL_SIZE = [string]$WorkerPoolSize

$process = Start-Process node `
  -ArgumentList "server.js" `
  -WorkingDirectory $backendDir `
  -PassThru

try {
  $process.ProcessorAffinity = $ProcessorAffinity
} catch {
  Write-Warning "Failed to set ProcessorAffinity. The backend is still running without CPU affinity restriction."
}

Write-Host "JS backend started."
Write-Host "PID: $($process.Id)"
Write-Host "URL: http://127.0.0.1:$Port"
Write-Host "NODE_ENV=$env:NODE_ENV WORKER_POOL_SIZE=$env:WORKER_POOL_SIZE ProcessorAffinity=$ProcessorAffinity"
Write-Host "Press Enter to stop the backend."
[void][Console]::ReadLine()

if (!$process.HasExited) {
  Stop-Process -Id $process.Id -Force
}
