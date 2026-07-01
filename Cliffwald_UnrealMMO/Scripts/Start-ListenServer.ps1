param(
    [int]$Port = 7777,
    [string]$Map = "/Game/Maps/L_CliffwaldPrototype",
    [string]$ExePath = "",
    [string]$LogPath = "",
    [switch]$Visible,
    [switch]$WithRHI
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ([string]::IsNullOrWhiteSpace($ExePath)) {
    $ExePath = Join-Path $ProjectRoot "Packaged\Windows\Cliffwald.exe"
}

if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = Join-Path $ProjectRoot "Saved\Logs\CliffwaldListenServer.log"
}

if (-not (Test-Path -LiteralPath $ExePath)) {
    throw "Packaged executable not found: $ExePath"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $LogPath) | Out-Null

$arguments = @(
    "$Map`?listen",
    "-port=$Port",
    "-log",
    "-abslog=$LogPath",
    "-nosound",
    "-unattended"
)

if (-not $WithRHI) {
    $arguments += "-nullrhi"
}

$windowStyle = "Hidden"
if ($Visible) {
    $windowStyle = "Normal"
}

Start-Process -FilePath $ExePath -ArgumentList $arguments -WindowStyle $windowStyle -PassThru
