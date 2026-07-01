param(
    [string]$EngineRoot = $env:UE_5_8_ROOT,
    [switch]$NoNativeMcp
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($EngineRoot)) {
    $EngineRoot = "D:\Epic Games\UE_5.8"
}

$ProjectPath = Resolve-Path (Join-Path $PSScriptRoot "..\Cliffwald.uproject")
$EditorPath = Join-Path $EngineRoot "Engine\Binaries\Win64\UnrealEditor.exe"

if (-not (Test-Path $EditorPath)) {
    throw "UE 5.8 editor not found at '$EditorPath'. Install UE 5.8 or pass -EngineRoot / set UE_5_8_ROOT."
}

$ArgumentList = @(
    "`"$ProjectPath`"",
    "/Game/Maps/L_CliffwaldPrototype",
    "-NoLiveCoding"
)

if (-not $NoNativeMcp) {
    $ArgumentList += "-ModelContextProtocolStartServer"
    $ArgumentList += "-ModelContextProtocolPort=8000"
}

Start-Process -FilePath $EditorPath -ArgumentList $ArgumentList
