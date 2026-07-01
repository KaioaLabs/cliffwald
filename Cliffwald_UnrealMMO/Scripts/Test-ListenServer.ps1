param(
    [int]$Port = 7777,
    [int]$ServerWarmupSeconds = 12,
    [int]$ClientWarmupSeconds = 18,
    [int]$ExpectedEchoCount = 96,
    [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ServerLog = Join-Path $ProjectRoot "Saved\Logs\CliffwaldListenServer.log"
$ClientLog = Join-Path $ProjectRoot "Saved\Logs\CliffwaldClientLocal.log"

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

Get-Process Cliffwald -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -LiteralPath $ServerLog, $ClientLog -ErrorAction SilentlyContinue

$server = & (Join-Path $PSScriptRoot "Start-ListenServer.ps1") -Port $Port -LogPath $ServerLog
Start-Sleep -Seconds $ServerWarmupSeconds

$endpoint = Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object LocalPort -EQ $Port
if ($null -eq $endpoint) {
    throw "Listen server did not open UDP port $Port"
}

$client = & (Join-Path $PSScriptRoot "Start-LocalClient.ps1") -Address "127.0.0.1:$Port" -LogPath $ClientLog
Start-Sleep -Seconds $ClientWarmupSeconds

$serverBad = Count-Matches $ServerLog "GameNetDriver is not using Iris|Ensure condition failed|Handled ensure|Fatal|Error:|missing CliffwaldPrototypeWorld"
$clientBad = Count-Matches $ClientLog "GameNetDriver is not using Iris|Ensure condition failed|Handled ensure|Fatal|Error:"
$clientMoveWarnings = Count-Matches $ClientLog "ClientAdjustPosition|CreateSavedMove"
$echoCount = Count-Matches $ServerLog "configured as transient AI skin"
$schoolPhaseCount = Count-Matches $ServerLog "School clock phase advanced"
$humanClaimedCount = Count-Matches $ServerLog "yielded Echo control to human player"
$rosterCappedCount = Count-Matches $ServerLog "Roster presence check: Humans=1 ActiveEchoes=95 TotalVisible=96 Cap=96"
$joinSucceeded = Count-Matches $ServerLog "Join succeeded"
$clientWelcomed = Count-Matches $ClientLog "Welcomed by server"

$result = [PSCustomObject]@{
    Port = $Port
    ServerProcessId = $server.Id
    ClientProcessId = $client.Id
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
    ServerLog = $ServerLog
    ClientLog = $ClientLog
}

$result | Format-List

if ($echoCount -ne $ExpectedEchoCount -or $schoolPhaseCount -lt 1 -or $humanClaimedCount -lt 1 -or $rosterCappedCount -lt 1 -or $joinSucceeded -lt 1 -or $clientWelcomed -lt 1 -or $serverBad -ne 0 -or $clientBad -ne 0 -or $clientMoveWarnings -ne 0) {
    throw "Listen server smoke test failed"
}

if (-not $KeepRunning) {
    Get-Process Cliffwald -ErrorAction SilentlyContinue | Stop-Process -Force
}
