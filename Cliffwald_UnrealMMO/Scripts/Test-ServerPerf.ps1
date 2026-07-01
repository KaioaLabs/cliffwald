param(
    [int]$Port = 7777,
    [int]$DurationSeconds = 120,
    [int]$SampleIntervalSeconds = 5,
    [int]$ServerWarmupSeconds = 12,
    [int]$ExpectedEchoCount = 96,
    [int]$ExpectedPhaseTransitions = 2,
    [double]$MaxAverageCpuTotalPercent = 10.0,
    [double]$MaxPeakWorkingSetMB = 2048.0,
    [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ServerLog = Join-Path $ProjectRoot "Saved\Logs\CliffwaldServerPerf.log"
$PerfCsv = Join-Path $ProjectRoot "Saved\Logs\CliffwaldServerPerf.csv"

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
Remove-Item -LiteralPath $ServerLog, $PerfCsv -ErrorAction SilentlyContinue

$server = $null
$samples = @()

try {
    $server = & (Join-Path $PSScriptRoot "Start-DedicatedServer.ps1") -Port $Port -LogPath $ServerLog
    Start-Sleep -Seconds $ServerWarmupSeconds

    $endpoint = Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object LocalPort -EQ $Port | Select-Object -First 1
    if ($null -eq $endpoint) {
        throw "Dedicated server did not open UDP port $Port"
    }

    $serverProcessId = $endpoint.OwningProcess
    $logicalProcessorCount = [Environment]::ProcessorCount
    $previousProcess = Get-Process -Id $serverProcessId -ErrorAction Stop
    $previousTime = Get-Date
    $deadline = $previousTime.AddSeconds($DurationSeconds)

    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds $SampleIntervalSeconds

        $currentTime = Get-Date
        $currentProcess = Get-Process -Id $serverProcessId -ErrorAction Stop
        $elapsedSeconds = [Math]::Max(0.001, ($currentTime - $previousTime).TotalSeconds)
        $cpuDeltaSeconds = [Math]::Max(0.0, $currentProcess.CPU - $previousProcess.CPU)
        $cpuTotalPercent = ($cpuDeltaSeconds / ($elapsedSeconds * $logicalProcessorCount)) * 100.0

        $samples += [PSCustomObject]@{
            Timestamp = $currentTime.ToString("o")
            CpuTotalPercent = [Math]::Round($cpuTotalPercent, 3)
            WorkingSetMB = [Math]::Round($currentProcess.WorkingSet64 / 1MB, 2)
            PrivateMemoryMB = [Math]::Round($currentProcess.PrivateMemorySize64 / 1MB, 2)
        }

        $previousProcess = $currentProcess
        $previousTime = $currentTime
    }

    $samples | Export-Csv -LiteralPath $PerfCsv -NoTypeInformation

    $serverBad = Count-Matches $ServerLog "Ensure condition failed|Handled ensure|Fatal|Error:|missing CliffwaldPrototypeWorld"
    $serverIrisWarnings = Count-Matches $ServerLog "LogIris: Warning"
    $echoCount = Count-Matches $ServerLog "configured as transient AI skin"
    $zeroHumanRosterCount = Count-Matches $ServerLog "Roster presence check: Humans=0 ActiveEchoes=96 TotalVisible=96 Cap=96"
    $schoolPhaseCount = Count-Matches $ServerLog "School clock phase advanced"
    $joinSucceeded = Count-Matches $ServerLog "Join succeeded"

    $averageCpu = if ($samples.Count -gt 0) { ($samples | Measure-Object CpuTotalPercent -Average).Average } else { 0.0 }
    $peakCpu = if ($samples.Count -gt 0) { ($samples | Measure-Object CpuTotalPercent -Maximum).Maximum } else { 0.0 }
    $peakWorkingSet = if ($samples.Count -gt 0) { ($samples | Measure-Object WorkingSetMB -Maximum).Maximum } else { 0.0 }
    $peakPrivateMemory = if ($samples.Count -gt 0) { ($samples | Measure-Object PrivateMemoryMB -Maximum).Maximum } else { 0.0 }

    $result = [PSCustomObject]@{
        Port = $Port
        DurationSeconds = $DurationSeconds
        SampleIntervalSeconds = $SampleIntervalSeconds
        SampleCount = $samples.Count
        ServerLauncherProcessId = $server.Id
        ServerRuntimeProcessId = $serverProcessId
        LogicalProcessors = $logicalProcessorCount
        EchoCount = $echoCount
        ExpectedEchoCount = $ExpectedEchoCount
        ZeroHumanRosterCount = $zeroHumanRosterCount
        SchoolPhaseCount = $schoolPhaseCount
        ExpectedPhaseTransitions = $ExpectedPhaseTransitions
        JoinSucceeded = $joinSucceeded
        AverageCpuTotalPercent = [Math]::Round($averageCpu, 3)
        PeakCpuTotalPercent = [Math]::Round($peakCpu, 3)
        MaxAverageCpuTotalPercent = $MaxAverageCpuTotalPercent
        PeakWorkingSetMB = [Math]::Round($peakWorkingSet, 2)
        MaxPeakWorkingSetMB = $MaxPeakWorkingSetMB
        PeakPrivateMemoryMB = [Math]::Round($peakPrivateMemory, 2)
        ServerBadCount = $serverBad
        ServerIrisWarningCount = $serverIrisWarnings
        ServerLog = $ServerLog
        PerfCsv = $PerfCsv
    }

    $result | Format-List

    if ($echoCount -ne $ExpectedEchoCount -or
        $zeroHumanRosterCount -lt 1 -or
        $schoolPhaseCount -lt $ExpectedPhaseTransitions -or
        $joinSucceeded -ne 0 -or
        $serverBad -ne 0 -or
        $serverIrisWarnings -ne 0 -or
        $averageCpu -gt $MaxAverageCpuTotalPercent -or
        $peakWorkingSet -gt $MaxPeakWorkingSetMB) {
        throw "Server performance test failed"
    }
}
finally {
    if (-not $KeepRunning) {
        Stop-CliffwaldProcesses
    }
}
