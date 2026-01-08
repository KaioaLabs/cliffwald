param (
    [string]$mode
)

$ErrorActionPreference = "Stop"
$schemaPath = "prisma\schema.prisma"

Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "   SWITCHING ENVIRONMENT TO: $mode" -ForegroundColor Cyan
Write-Host "------------------------------------------------"

# 1. Swap .env file
if ($mode -eq "cloud") {
    if (Test-Path ".env.cloud") {
        Copy-Item ".env.cloud" -Destination ".env" -Force
        Write-Host "[ENV] Loaded .env.cloud (Supabase/PostgreSQL)" -ForegroundColor Green
    }
    
    # 2. Modify schema.prisma for PostgreSQL
    $content = Get-Content $schemaPath -Raw
    if ($content -match 'provider\s*=\s*"sqlite"') {
         $content = $content -replace 'provider\s*=\s*"sqlite"', 'provider = "postgresql"'
         $content = $content -replace 'url\s*=\s*env\("DATABASE_URL"\)', 'url = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")'
         Set-Content -Path $schemaPath -Value $content
         Write-Host "[SCHEMA] Updated schema.prisma to PostgreSQL" -ForegroundColor Yellow
    }
    
} elseif ($mode -eq "local") {
    if (Test-Path ".env.local") {
        Copy-Item ".env.local" -Destination ".env" -Force
        Write-Host "[ENV] Loaded .env.local (SQLite)" -ForegroundColor Green
    }

    # 2. Modify schema.prisma for SQLite
    $content = Get-Content $schemaPath -Raw
    if ($content -match 'provider\s*=\s*"postgresql"') {
         $content = $content -replace 'provider\s*=\s*"postgresql"', 'provider = "sqlite"'
         # Remove directUrl line if present
         $content = $content -replace 'directUrl\s*=\s*env\("DIRECT_URL"\)', ''
         # Clean up empty lines created by removal
         $content = $content -replace '(?m)^\s*\r?\n', '' 
         Set-Content -Path $schemaPath -Value $content
         Write-Host "[SCHEMA] Updated schema.prisma to SQLite" -ForegroundColor Yellow
    }
}

# 3. Regenerate Client
Write-Host "Regenerating Prisma Client..." -ForegroundColor Yellow
cmd /c "npx prisma generate"

Write-Host "DONE. Ready to start." -ForegroundColor Green
