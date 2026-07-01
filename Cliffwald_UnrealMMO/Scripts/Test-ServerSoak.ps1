param(
    [int]$Port = 7777,
    [int]$DurationSeconds = 120,
    [int]$ReconnectCycles = 3,
    [int]$ServerWarmupSeconds = 12,
    [int]$ClientOnlineSeconds = 14,
    [int]$DisconnectTimeoutSeconds = 35,
    [int]$ExpectedEchoCount = 96,
    [int]$ExpectedPhaseTransitions = 2,
    [string]$ClientExePath = "",
    [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ServerLog = Join-Path $ProjectRoot "Saved\Logs\CliffwaldServerSoak.log"
$ClientLogRoot = Join-Path $ProjectRoot "Saved\Logs"

if ([string]::IsNullOrWhiteSpace($ClientExePath)) {
    $ClientExePath = Join-Path $ProjectRoot "PackagedSourceClient\Windows\Cliffwald.exe"
}

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

function Stop-CliffwaldClientProcesses {
    Get-Process Cliffwald -ErrorAction SilentlyContinue | Stop-Process -Force
}

function Wait-LogCount {
    param(
        [string]$Path,
        [string]$Pattern,
        [int]$ExpectedCount,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        if ((Count-Matches $Path $Pattern) -ge $ExpectedCount) {
            return
        }
        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $deadline)

    $actualCount = Count-Matches $Path $Pattern
    throw "Timed out waiting for '$Pattern' to reach $ExpectedCount. Actual count: $actualCount."
}

function Assert-NoRosterOverflow {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $overflow = Select-String -Path $Path -Pattern "Roster presence check: Humans=(\d+) ActiveEchoes=(\d+) TotalVisible=(\d+) Cap=(\d+)" |
        Where-Object {
            $total = [int]$_.Matches[0].Groups[3].Value
            $cap = [int]$_.Matches[0].Groups[4].Value
            $total -gt $cap
        } |
        Select-Object -First 1

    if ($null -ne $overflow) {
        throw "Roster overflow detected: $($overflow.Line)"
    }
}

Stop-CliffwaldProcesses
Remove-Item -LiteralPath $ServerLog -ErrorAction SilentlyContinue
Get-ChildItem -LiteralPath $ClientLogRoot -Filter "CliffwaldSoakClient*.log" -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

$server = $null
$clients = @()
$startedAt = Get-Date

try {
    $server = & (Join-Path $PSScriptRoot "Start-DedicatedServer.ps1") -Port $Port -LogPath $ServerLog
    Start-Sleep -Seconds $ServerWarmupSeconds

    $endpoint = Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object LocalPort -EQ $Port
    if ($null -eq $endpoint) {
        throw "Dedicated server did not open UDP port $Port"
    }

    for ($cycle = 1; $cycle -le $ReconnectCycles; ++$cycle) {
        $clientLog = Join-Path $ClientLogRoot ("CliffwaldSoakClient{0}.log" -f $cycle)
        $client = & (Join-Path $PSScriptRoot "Start-LocalClient.ps1") -Address "127.0.0.1:$Port" -ExePath $ClientExePath -LogPath $clientLog
        $clients += $client

        Start-Sleep -Seconds $ClientOnlineSeconds

        if (-not $client.HasExited) {
            Stop-Process -Id $client.Id -Force
        }
        Stop-CliffwaldClientProcesses

        Wait-LogCount -Path $ServerLog -Pattern "Echo continuity restored" -ExpectedCount $cycle -TimeoutSeconds $DisconnectTimeoutSeconds
        Wait-LogCount -Path $ServerLog -Pattern "Roster presence check: Humans=0 ActiveEchoes=96 TotalVisible=96 Cap=96" -ExpectedCount ($cycle + 1) -TimeoutSeconds 5
    }

    $elapsedSeconds = [int]((Get-Date) - $startedAt).TotalSeconds
    $remainingSeconds = $DurationSeconds - $elapsedSeconds
    if ($remainingSeconds -gt 0) {
        Start-Sleep -Seconds $remainingSeconds
    }

    $endpoint = Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object LocalPort -EQ $Port
    if ($null -eq $endpoint) {
        throw "Dedicated server stopped listening on UDP port $Port during soak"
    }

    Assert-NoRosterOverflow -Path $ServerLog

    $serverBad = Count-Matches $ServerLog "Ensure condition failed|Handled ensure|Fatal|Error:|missing CliffwaldPrototypeWorld"
    $serverIrisWarnings = Count-Matches $ServerLog "LogIris: Warning"
    $echoCount = Count-Matches $ServerLog "configured as transient AI skin"
    $schoolPhaseCount = Count-Matches $ServerLog "School clock phase advanced"
    $humanClaimedCount = Count-Matches $ServerLog "Join succeeded: human player claimed roster slot"
    $echoRestoredCount = Count-Matches $ServerLog "Echo continuity restored"
    $rosterCappedCount = Count-Matches $ServerLog "Roster presence check: Humans=1 ActiveEchoes=95 TotalVisible=96 Cap=96"
    $zeroHumanRosterCount = Count-Matches $ServerLog "Roster presence check: Humans=0 ActiveEchoes=96 TotalVisible=96 Cap=96"
    $clientBad = 0
    $clientWelcomed = 0

    foreach ($clientLog in Get-ChildItem -LiteralPath $ClientLogRoot -Filter "CliffwaldSoakClient*.log" -ErrorAction SilentlyContinue) {
        $clientBad += Count-Matches $clientLog.FullName "Ensure condition failed|Handled ensure|Fatal|Error:"
        $clientWelcomed += Count-Matches $clientLog.FullName "Welcomed by server"
    }

    $result = [PSCustomObject]@{
        Port = $Port
        DurationSeconds = [int]((Get-Date) - $startedAt).TotalSeconds
        ReconnectCycles = $ReconnectCycles
        ServerLauncherProcessId = $server.Id
        UdpOwningProcess = ($endpoint | Select-Object -First 1).OwningProcess
        EchoCount = $echoCount
        ExpectedEchoCount = $ExpectedEchoCount
        SchoolPhaseCount = $schoolPhaseCount
        ExpectedPhaseTransitions = $ExpectedPhaseTransitions
        HumanClaimedCount = $humanClaimedCount
        EchoRestoredCount = $echoRestoredCount
        RosterCappedCount = $rosterCappedCount
        ZeroHumanRosterCount = $zeroHumanRosterCount
        ClientWelcomed = $clientWelcomed
        ServerBadCount = $serverBad
        ClientBadCount = $clientBad
        ServerIrisWarningCount = $serverIrisWarnings
        ServerLog = $ServerLog
        ClientLogPattern = (Join-Path $ClientLogRoot "CliffwaldSoakClient*.log")
    }

    $result | Format-List

    if ($echoCount -ne $ExpectedEchoCount -or
        $schoolPhaseCount -lt $ExpectedPhaseTransitions -or
        $humanClaimedCount -lt $ReconnectCycles -or
        $echoRestoredCount -lt $ReconnectCycles -or
        $rosterCappedCount -lt $ReconnectCycles -or
        $zeroHumanRosterCount -lt $ReconnectCycles -or
        $clientWelcomed -lt $ReconnectCycles -or
        $serverBad -ne 0 -or
        $clientBad -ne 0 -or
        $serverIrisWarnings -ne 0) {
        throw "Server soak/reconnect test failed"
    }
}
finally {
    if (-not $KeepRunning) {
        Stop-CliffwaldProcesses
    }
}
