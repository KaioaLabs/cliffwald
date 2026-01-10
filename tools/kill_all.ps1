# Smart Kill Script - PowerShell Version
Write-Host "[SAFE KILL] Analizando procesos de Cliffwald2D..."

$signatures = @(
    'user-data-dir=*tmp_chrome_data',   # Solo Chrome de este proyecto
    'src/server/index.ts',              # Solo nuestro Server
    'dist-server/server/index.js',      # Server en Produccion
    'vite --port 3000',                 # Solo nuestro Cliente en puerto 3000
    'tools/dev_launcher.js',            # Nuestro lanzador
    'tools/log_aggregator.ps1',         # Nuestro logger
    'tools/screenshot_monitor.ps1'      # Nuestro monitor visual
)

# Kill Design Tools (Aggressive)
$tools = @('tiled', 'aseprite')
foreach ($t in $tools) {
    $p = Get-Process -Name $t -ErrorAction SilentlyContinue
    if ($p) {
        Write-Host "[DETECTADO] Herramienta de Diseño: $($p.Name)"
        Stop-Process -InputObject $p -Force
        $killedCount++
    }
}

$processes = Get-CimInstance Win32_Process
$killedCount = 0

foreach ($p in $processes) {
    if ($p.CommandLine) {
        foreach ($sig in $signatures) {
            if ($p.CommandLine -like "*$sig*") {
                Write-Host "[DETECTADO] PID $($p.ProcessId): $($p.Name)"
                Write-Host "   Match: ...$sig..."
                
                Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
                $killedCount++
                break
            }
        }
    }
}

if ($killedCount -eq 0) {
    Write-Host "No se encontraron procesos activos de Cliffwald2D."
} else {
    Write-Host "Se terminaron $killedCount procesos asociados al proyecto."
}

Write-Host "[LIMPIEZA DE LOGS]"
if (Test-Path logs_server.txt) { Remove-Item logs_server.txt -ErrorAction Ignore; Write-Host "- Server Logs cleaned" }
if (Test-Path logs_client.txt) { Remove-Item logs_client.txt -ErrorAction Ignore; Write-Host "- Client Logs cleaned" }
if (Test-Path mmo_debug_log.txt) { Remove-Item mmo_debug_log.txt -ErrorAction Ignore; Write-Host "- Debug Report cleaned" }

# Clean Chrome Profiles to ensure flags work
if (Test-Path tmp_chrome_data_1) { Remove-Item tmp_chrome_data_1 -Recurse -Force -ErrorAction Ignore; Write-Host "- Chrome Profile 1 reset" }
if (Test-Path tmp_chrome_data_2) { Remove-Item tmp_chrome_data_2 -Recurse -Force -ErrorAction Ignore; Write-Host "- Chrome Profile 2 reset" }

Write-Host "[LISTO] Entorno limpio."
