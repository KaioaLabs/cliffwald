param(
    [int]$Port = 7777,
    [string]$Map = "/Game/Maps/L_CliffwaldPrototype",
    [string]$ExePath = "",
    [string]$LogPath = "",
    [string[]]$ExtraArgs = @(),
    [switch]$Visible
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ([string]::IsNullOrWhiteSpace($ExePath)) {
    $ExePath = Join-Path $ProjectRoot "PackagedServer\WindowsServer\CliffwaldServer.exe"
}

if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = Join-Path $ProjectRoot "Saved\Logs\CliffwaldDedicatedServer.log"
}

if (-not (Test-Path -LiteralPath $ExePath)) {
    throw "Packaged server executable not found: $ExePath"
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $LogPath) | Out-Null

$arguments = @(
    $Map,
    "-port=$Port",
    "-log",
    "-abslog=$LogPath",
    "-unattended"
)

$arguments += $ExtraArgs

$windowStyle = "Hidden"
if ($Visible) {
    $windowStyle = "Normal"
}

Start-Process `
    -FilePath $ExePath `
    -WorkingDirectory (Split-Path -Parent $ExePath) `
    -ArgumentList $arguments `
    -WindowStyle $windowStyle `
    -PassThru
