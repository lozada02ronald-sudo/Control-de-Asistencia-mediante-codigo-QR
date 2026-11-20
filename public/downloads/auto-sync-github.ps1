param(
  [int]$IntervalSeconds = 30
)

Write-Host "AcadeQR Auto-Sync GitHub iniciado (revisando cada $IntervalSeconds s)..." -ForegroundColor Cyan

while ($true) {
  $changes = git status --porcelain
  if ($changes) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Cambios detectados. Guardando en GitHub..." -ForegroundColor Yellow
    git add -A
    git commit -m "chore: auto-save $timestamp" | Out-Null
    $env:GIT_TERMINAL_PROMPT = "0"
    git push origin main
    git push origin main:dev
  }
  Start-Sleep -Seconds $IntervalSeconds
}
