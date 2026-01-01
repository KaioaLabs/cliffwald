# Script para capturar pantalla intensivamente al inicio y detenerse
$IntervalSeconds = 1
$OutputDir = "screenshots"
$MaxCaptures = 10 # Capturar durante 10 segundos

# Esperar a que Chrome se abra
Write-Host "[Monitor] Waiting for Chrome to start..."
while (-not (Get-Process chrome -ErrorAction SilentlyContinue)) {
    Start-Sleep -Seconds 1
}
Write-Host "[Monitor] Chrome detected! Starting capture..."

# 1. Crear directorio si no existe o limpiar si existe
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
} else {
    # Limpiar TODO el contenido para "pisar" la ejecucion anterior
    Get-ChildItem -Path $OutputDir -Include *.* -Recurse | Remove-Item -Force
    Write-Host "[Monitor] Directory cleaned. Overwriting previous session."
}

# Cargar ensamblados gráficos de .NET
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Write-Host "[Monitor] Starting INTENSIVE capture (1s interval) for the first $MaxCaptures seconds..."

for ($i = 1; $i -le $MaxCaptures; $i++) {
    try {
        # Monitor de la izquierda (coordenada X negativa)
        $targetScreen = [System.Windows.Forms.Screen]::AllScreens | Where-Object { $_.Bounds.X -lt 0 } | Select-Object -First 1
        
        if ($null -eq $targetScreen) {
            $targetScreen = [System.Windows.Forms.Screen]::PrimaryScreen
        }

        $rect = $targetScreen.Bounds
        $width = $rect.Width
        $height = $rect.Height
        $left = $rect.X
        $top = $rect.Y

        $bitmap = New-Object System.Drawing.Bitmap $width, $height
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($left, $top, 0, 0, $bitmap.Size)

        $timestamp = Get-Date -Format "HH-mm-ss"
        $filename = "$OutputDir\step_$($i.ToString('00'))_$timestamp.png"

        $bitmap.Save($filename, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $graphics.Dispose()
        $bitmap.Dispose()

        Write-Host "[Monitor] Snapshot $i/$MaxCaptures saved."

    } catch {
        Write-Host "[Monitor] Error capturing screen: $_"
    }

    Start-Sleep -Seconds $IntervalSeconds
}

Write-Host "[Monitor] Initial 30s period finished. Capture system stopping to save resources."
exit