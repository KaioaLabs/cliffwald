param(
    [int]$Port = 7777,
    [int]$ServerWarmupSeconds = 35,
    [int]$ExpectedEchoCount = 96,
    [int]$ExpectedPhaseTransitions = 2,
    [double]$RealMinutesPerSchoolDay = 0.0,
    [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ServerLog = Join-Path $ProjectRoot "Saved\Logs\CliffwaldAutonomousSchool.log"

function Count-Matches {
    param(
        [string]$Path,
        [string]$Pattern
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return 0
    }

    return (Select-String -Path $Path -Pattern $Pattern).Count
}

function Stop-CliffwaldProcesses {
    Get-Process Cliffwald, CliffwaldServer -ErrorAction SilentlyContinue | Stop-Process -Force
}

Stop-CliffwaldProcesses
Remove-Item -LiteralPath $ServerLog -ErrorAction SilentlyContinue

$server = $null

try {
    $extraArgs = @()
    $clockOverrideRequested = $RealMinutesPerSchoolDay -gt 0.0
    if ($clockOverrideRequested) {
        $formattedDayDuration = $RealMinutesPerSchoolDay.ToString("0.###", [Globalization.CultureInfo]::InvariantCulture)
        $extraArgs += "-CliffwaldRealMinutesPerSchoolDay=$formattedDayDuration"
    }

    $server = & (Join-Path $PSScriptRoot "Start-DedicatedServer.ps1") -Port $Port -LogPath $ServerLog -ExtraArgs $extraArgs
    Start-Sleep -Seconds $ServerWarmupSeconds

    $endpoint = Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object LocalPort -EQ $Port
    if ($null -eq $endpoint) {
        throw "Dedicated server did not open UDP port $Port"
    }

    $serverBad = Count-Matches $ServerLog "Ensure condition failed|Handled ensure|Fatal|Error:|missing CliffwaldPrototypeWorld"
    $serverIrisWarnings = Count-Matches $ServerLog "LogIris: Warning"
    $echoCount = Count-Matches $ServerLog "configured as transient AI skin"
    $schoolSpawnCount = Count-Matches $ServerLog "Spawned 96 autonomous Echo students"
    $zeroHumanRosterCount = Count-Matches $ServerLog "Roster presence check: Humans=0 ActiveEchoes=96 TotalVisible=96 Cap=96"
    $schoolPhaseCount = Count-Matches $ServerLog "School clock phase advanced"
    $schoolClockConfigCount = Count-Matches $ServerLog "School clock configured: RealMinutesPerSchoolDay"
    $joinSucceeded = Count-Matches $ServerLog "Join succeeded"
    $humanClaimedCount = Count-Matches $ServerLog "yielded Echo control to human player"

    $result = [PSCustomObject]@{
        Port = $Port
        ServerLauncherProcessId = $server.Id
        UdpOwningProcess = ($endpoint | Select-Object -First 1).OwningProcess
        EchoCount = $echoCount
        ExpectedEchoCount = $ExpectedEchoCount
        SchoolSpawnCount = $schoolSpawnCount
        ZeroHumanRosterCount = $zeroHumanRosterCount
        RealMinutesPerSchoolDayOverride = $RealMinutesPerSchoolDay
        ClockOverrideRequested = $clockOverrideRequested
        SchoolClockConfigCount = $schoolClockConfigCount
        SchoolPhaseCount = $schoolPhaseCount
        ExpectedPhaseTransitions = $ExpectedPhaseTransitions
        JoinSucceeded = $joinSucceeded
        HumanClaimedCount = $humanClaimedCount
        ServerBadCount = $serverBad
        ServerIrisWarningCount = $serverIrisWarnings
        ServerLog = $ServerLog
    }

    $result | Format-List

    if ($echoCount -ne $ExpectedEchoCount -or $schoolSpawnCount -lt 1 -or $zeroHumanRosterCount -lt 1 -or ($clockOverrideRequested -and $schoolClockConfigCount -lt 1) -or $schoolPhaseCount -lt $ExpectedPhaseTransitions -or $joinSucceeded -ne 0 -or $humanClaimedCount -ne 0 -or $serverBad -ne 0 -or $serverIrisWarnings -ne 0) {
        throw "Autonomous school server test failed"
    }
}
finally {
    if (-not $KeepRunning) {
        Stop-CliffwaldProcesses
    }
}
