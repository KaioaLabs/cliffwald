$ErrorActionPreference = "SilentlyContinue"
$OutputFile = "mmo_debug_log.txt"
$ServerLog = "logs_server.txt"
$ClientLog = "logs_client.txt"
$ChromeLog1 = "tmp_chrome_data_1\chrome_debug.log"
$ChromeLog2 = "tmp_chrome_data_2\chrome_debug.log"

Write-Host "Iniciando monitor de logs unificado (MULTICLIENTE)..."
Write-Host "Salida: $OutputFile"

while($true) {
    # 1. Leer Logs de Servidor y Vite
    $s = if(Test-Path $ServerLog) { Get-Content $ServerLog -Tail 100 } else { "Esperando logs del servidor..." }
    $c = if(Test-Path $ClientLog) { Get-Content $ClientLog -Tail 50 } else { "Esperando logs del cliente..." }
    
    # 2. Función para filtrar Chrome
    function Get-FilteredChrome($path, $label) {
        if(-not (Test-Path $path)) { return "[$label] Sin logs." }
        $lines = @()
        $raw = Get-Content $path -Tail 200
        foreach($line in $raw) {
            # Capture CRITICAL errors and CONNECT logs explicitly
            if ($line -match "\[CRITICAL\]" -or $line -match "\[CONNECT\]") {
                $clean = $line -replace "^\[.*:CONSOLE\(\d+\)\]\s*", ""
                $lines += "[$label] $clean"
            }
            elseif ($line -match "INFO:CONSOLE" -or $line -match "ERROR:") {
                if ($line -notmatch "Import Map" -and $line -notmatch "Bluetooth" -and $line -notmatch "USB") {
                    # Limpiar un poco el prefijo de Chrome para legibilidad
                    $clean = $line -replace "^\[.*:CONSOLE\(\d+\)\]\s*", ""
                    $lines += "[$label] $clean"
                }
            }
        }
        return $lines
    }

    $k1 = Get-FilteredChrome $ChromeLog1 "ALICE"
    $k2 = Get-FilteredChrome $ChromeLog2 "BOB"

    # 3. Construir reporte
    $report = @()
    $report += "=========================================================="
    $report += "   CLIFFWALD 2D - UNIFIED DEBUG LOG (FILTERED)"
    $report += "   Ultima actualizacion: $(Get-Date)"
    $report += "=========================================================="
    $report += ""
    $report += "[[[[ SERVER LOG ]]]]"
    $report += $s
    $report += ""
    $report += "[[[[ CONSOLE: ALICE ]]]]"
    $report += $k1
    $report += ""
    $report += "[[[[ CONSOLE: BOB ]]]]"
    $report += $k2
    $report += ""
    $report += "=========================================================="

    $report | Out-File -Encoding UTF8 $OutputFile
    Start-Sleep -Seconds 5
}