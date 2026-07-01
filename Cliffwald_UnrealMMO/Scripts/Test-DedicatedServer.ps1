param(
    [int]$Port = 7777,
    [int]$ServerWarmupSeconds = 12,
    [int]$ClientWarmupSeconds = 18,
    [int]$ExpectedEchoCount = 96,
    [string]$ClientExePath = "",
    [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ServerLog = Join-Path $ProjectRoot "Saved\Logs\CliffwaldDedicatedServer.log"
$ClientLog = Join-Path $ProjectRoot "Saved\Logs\CliffwaldDedicatedClient.log"

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

Stop-CliffwaldProcesses
Remove-Item -LiteralPath $ServerLog, $ClientLog -ErrorAction SilentlyContinue

$server = $null
$client = $null

try {
    $server = & (Join-Path $PSScriptRoot "Start-DedicatedServer.ps1") -Port $Port -LogPath $ServerLog
    Start-Sleep -Seconds $ServerWarmupSeconds

    $endpoint = Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object LocalPort -EQ $Port
    if ($null -eq $endpoint) {
        throw "Dedicated server did not open UDP port $Port"
    }

    $client = & (Join-Path $PSScriptRoot "Start-LocalClient.ps1") -Address "127.0.0.1:$Port" -ExePath $ClientExePath -LogPath $ClientLog
    Start-Sleep -Seconds $ClientWarmupSeconds

    $serverBad = Count-Matches $ServerLog "Ensure condition failed|Handled ensure|Fatal|Error:|missing CliffwaldPrototypeWorld"
    $clientBad = Count-Matches $ClientLog "Ensure condition failed|Handled ensure|Fatal|Error:"
    $clientMoveWarnings = Count-Matches $ClientLog "ClientAdjustPosition|CreateSavedMove"
    $serverIrisWarnings = Count-Matches $ServerLog "LogIris: Warning"
    $echoCount = Count-Matches $ServerLog "configured as transient AI skin"
    $schoolPhaseCount = Count-Matches $ServerLog "School clock phase advanced"
    $humanClaimedCount = Count-Matches $ServerLog "yielded Echo control to human player"
    $rosterCappedCount = Count-Matches $ServerLog "Roster presence check: Humans=1 ActiveEchoes=95 TotalVisible=96 Cap=96"
    $joinSucceeded = Count-Matches $ServerLog "Join succeeded"
    $clientWelcomed = Count-Matches $ClientLog "Welcomed by server"

    $result = [PSCustomObject]@{
        Port = $Port
        ServerLauncherProcessId = $server.Id
        ClientLauncherProcessId = $client.Id
        UdpOwningProcess = ($endpoint | Select-Object -First 1).OwningProcess
        EchoCount = $echoCount
        ExpectedEchoCount = $ExpectedEchoCount
        SchoolPhaseCount = $schoolPhaseCount
        HumanClaimedCount = $humanClaimedCount
        RosterCappedCount = $rosterCappedCount
        JoinSucceeded = $joinSucceeded
        ClientWelcomed = $clientWelcomed
        ServerBadCount = $serverBad
        ClientBadCount = $clientBad
        ClientMoveWarningCount = $clientMoveWarnings
        ServerIrisWarningCount = $serverIrisWarnings
        ServerLog = $ServerLog
        ClientLog = $ClientLog
        ClientExePath = $ClientExePath
    }

    $result | Format-List

    if ($echoCount -ne $ExpectedEchoCount -or $schoolPhaseCount -lt 1 -or $humanClaimedCount -lt 1 -or $rosterCappedCount -lt 1 -or $joinSucceeded -lt 1 -or $clientWelcomed -lt 1 -or $serverBad -ne 0 -or $clientBad -ne 0 -or $clientMoveWarnings -ne 0 -or $serverIrisWarnings -ne 0) {
        throw "Dedicated server smoke test failed"
    }
}
finally {
    if (-not $KeepRunning) {
        Stop-CliffwaldProcesses
    }
}
