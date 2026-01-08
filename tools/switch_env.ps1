param (
    [string]$mode
)

$ErrorActionPreference = "Stop"

Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "   SWITCHING ENVIRONMENT TO: $mode" -ForegroundColor Cyan
Write-Host "------------------------------------------------"

if ($mode -eq "cloud") {
    if (Test-Path ".env.cloud") {
        Copy-Item ".env.cloud" -Destination ".env" -Force
        Write-Host "SUCCESS: Loaded .env.cloud (Supabase/PostgreSQL)" -ForegroundColor Green
    } else {
        Write-Error "ERROR: .env.cloud not found!"
    }
} elseif ($mode -eq "local") {
    if (Test-Path ".env.local") {
        Copy-Item ".env.local" -Destination ".env" -Force
        Write-Host "SUCCESS: Loaded .env.local (SQLite)" -ForegroundColor Green
    } else {
        Write-Error "ERROR: .env.local not found!"
    }
} else {
    Write-Error "Invalid mode. Use 'cloud' or 'local'."
}

Write-Host "Regenerating Prisma Client for new provider..." -ForegroundColor Yellow
# We use call operator & to ensure it runs in the shell
cmd /c "npx prisma generate"

Write-Host "DONE. Ready to start." -ForegroundColor Green