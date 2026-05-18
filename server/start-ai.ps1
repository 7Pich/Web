$ErrorActionPreference = "Stop"

if ($args -contains "-ResetPort") {
  $listeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    Stop-Process -Id $listener.OwningProcess -Force
    Write-Host "Stopped old server on port 3000." -ForegroundColor Green
  }
}

if (!(Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env file." -ForegroundColor Green
  Write-Host "Open server/.env and paste your NEW Gemini key, then run this script again." -ForegroundColor Yellow
  notepad ".env"
  exit 0
}

npm install
npm start
