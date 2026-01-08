param (
    [string]$mode = "local"
)

$envFile = ".env"
$schemaFile = "prisma/schema.prisma"

Write-Host "🔄 Switching Environment to: $mode" -ForegroundColor Cyan

if ($mode -eq "cloud") {
    # 1. Copy .env
    Copy-Item ".env.cloud" $envFile -Force
    
    # 2. Update Schema Provider to PostgreSQL
    $schemaContent = Get-Content $schemaFile
    $newContent = $schemaContent -replace 'provider\s*=\s*"sqlite"', 'provider = "postgresql"'
    
    # Add directUrl if missing (simple check)
    if ($newContent -notmatch 'directUrl') {
        $newContent = $newContent -replace 'url\s*=\s*env\("DATABASE_URL"\)', 'url      = env("DATABASE_URL")`n  directUrl = env("DIRECT_URL")'
    }
    
    $newContent | Set-Content $schemaFile
    Write-Host "✅ Configured for Supabase (PostgreSQL)" -ForegroundColor Green

} else {
    # 1. Copy .env
    Copy-Item ".env.local" $envFile -Force
    
    # 2. Update Schema Provider to SQLite
    $schemaContent = Get-Content $schemaFile
    $newContent = $schemaContent -replace 'provider\s*=\s*"postgresql"', 'provider = "sqlite"'
    
    # Remove directUrl line for SQLite
    $newContent = $newContent | Where-Object { $_ -notmatch 'directUrl' }
    
    $newContent | Set-Content $schemaFile
    Write-Host "✅ Configured for Local (SQLite)" -ForegroundColor Green
}
