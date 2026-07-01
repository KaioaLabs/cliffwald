param(
    [string]$EngineRoot = "D:\UnrealEngine-5.8-source",
    [string]$TestFilter = "Cliffwald.",
    [string]$LogPath = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ProjectFile = Join-Path $ProjectRoot "Cliffwald.uproject"
$EditorCmd = Join-Path $EngineRoot "Engine\Binaries\Win64\UnrealEditor-Cmd.exe"

if (-not (Test-Path -LiteralPath $EditorCmd)) {
    throw "UnrealEditor-Cmd.exe not found at $EditorCmd"
}

$LogsDir = Join-Path $ProjectRoot "Saved\Logs"
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = Join-Path $LogsDir "CliffwaldUnrealAutomation.log"
}

if (Test-Path -LiteralPath $LogPath) {
    Remove-Item -LiteralPath $LogPath -Force
}

$ReportDir = Join-Path $LogsDir "AutomationReports"
if (Test-Path -LiteralPath $ReportDir) {
    Remove-Item -LiteralPath $ReportDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

$arguments = @(
    $ProjectFile,
    "-Game",
    "-unattended",
    "-nopause",
    "-nop4",
    "-NullRHI",
    "-nosplash",
    "-NoSound",
    "-DisablePython",
    "-ExecCmds=Automation RunTests $TestFilter; Quit",
    "-TestExit=Automation Test Queue Empty",
    "-ReportExportPath=$ReportDir",
    "-Log",
    "-abslog=$LogPath",
    "-stdout",
    "-FullStdOutLogOutput",
    "-ForceLogFlush"
)

& $EditorCmd @arguments
if ($LASTEXITCODE -ne 0) {
    throw "Unreal automation command failed with exit code $LASTEXITCODE. See $LogPath"
}

if (-not (Test-Path -LiteralPath $LogPath)) {
    throw "Unreal automation log was not written: $LogPath"
}

$logText = Get-Content -LiteralPath $LogPath -Raw
if ($logText -notmatch "Automation Test Queue Empty") {
    throw "Automation queue did not report completion. See $LogPath"
}

if ($logText -match "Test Completed\. Result=\{Fail\}" -or $logText -match "Automation Test Failed") {
    throw "Unreal automation reported failures. See $LogPath"
}

if ($logText -match "LogPython: Error") {
    throw "Unreal automation log contains Python startup errors. See $LogPath"
}

$jsonReports = @(Get-ChildItem -LiteralPath $ReportDir -Recurse -Filter "*.json" -ErrorAction SilentlyContinue)

[PSCustomObject]@{
    TestFilter = $TestFilter
    LogPath = $LogPath
    ReportDir = $ReportDir
    JsonReportCount = $jsonReports.Count
} | Format-List
