param(
    [string]$ApkPath = "",
    [string]$AdbPath = "",
    [string]$AaptPath = "",
    [string]$DeviceSerial = "",
    [string]$ProjectName = "Cliffwald",
    [string]$ExpectedPackageName = "com.cliffwald.online",
    [string]$ServerAddress = "",
    [int]$Port = 7777,
    [int]$WarmupSeconds = 45,
    [int]$MaxTotalPssMB = 1200,
    [int]$MaxTotalRssMB = 1400,
    [int]$MaxSwapPssMB = 512,
    [int]$MinGfxFramesForPacing = 120,
    [double]$MaxJankyFramePercent = 15.0,
    [int]$MaxFrameP95Ms = 50,
    [int]$CsvCaptureFrames = 360,
    [double]$CsvCaptureDelaySeconds = 30.0,
    [int]$CsvMetricWindowFrames = 240,
    [int]$MinCsvFramesForPacing = 120,
    [double]$MaxCsvFrameP95Ms = 50.0,
    [double]$MaxCsvFrameP99Ms = 75.0,
    [switch]$StartLocalServer,
    [switch]$SkipInstall,
    [switch]$SkipUnrealCsvProfile,
    [switch]$EnableUnrealCsvGpuStats,
    [switch]$RequireUnrealCsvProfile,
    [switch]$RequireFramePacingSample,
    [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ([string]::IsNullOrWhiteSpace($ApkPath)) {
    $ApkPath = Join-Path $ProjectRoot "PackagedAndroid\Android\Cliffwald-arm64.apk"
}

function Resolve-Executable {
    param(
        [string]$RequestedPath,
        [string]$CommandName,
        [string[]]$Fallbacks = @()
    )

    if (-not [string]::IsNullOrWhiteSpace($RequestedPath)) {
        if (Test-Path -LiteralPath $RequestedPath) {
            return (Resolve-Path -LiteralPath $RequestedPath).Path
        }
        throw "$CommandName not found at requested path: $RequestedPath"
    }

    $command = Get-Command $CommandName -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $command) {
        return $command.Source
    }

    foreach ($fallback in $Fallbacks) {
        if (Test-Path -LiteralPath $fallback) {
            return (Resolve-Path -LiteralPath $fallback).Path
        }
    }

    throw "$CommandName was not found"
}

function Invoke-External {
    param(
        [string]$FilePath,
        [string[]]$Arguments
    )

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = & $FilePath @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($exitCode -ne 0) {
        throw "$FilePath $($Arguments -join ' ') failed with exit code $exitCode`n$($output -join "`n")"
    }
    return $output
}

function Invoke-ExternalOptional {
    param(
        [string]$FilePath,
        [string[]]$Arguments
    )

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = & $FilePath @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    return [PSCustomObject]@{
        ExitCode = $exitCode
        Output = $output
    }
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

function Quote-AndroidShellValue {
    param([string]$Value)

    if ($Value.Contains("'")) {
        throw "Android shell quoting for single quotes is not supported by this smoke script: $Value"
    }

    return "'$Value'"
}

function Convert-KBToMB {
    param([Nullable[int]]$ValueKB)

    if ($null -eq $ValueKB) {
        return $null
    }

    return [Math]::Round($ValueKB / 1024.0, 2)
}

function Get-AndroidMemMetrics {
    param([string]$Path)

    $text = if (Test-Path -LiteralPath $Path) { Get-Content -LiteralPath $Path -Raw } else { "" }
    $totalPssKB = $null
    $totalRssKB = $null
    $totalSwapPssKB = $null

    if ($text -match "TOTAL PSS:\s+(\d+)\s+TOTAL RSS:\s+(\d+)\s+TOTAL SWAP PSS:\s+(\d+)") {
        $totalPssKB = [int]$Matches[1]
        $totalRssKB = [int]$Matches[2]
        $totalSwapPssKB = [int]$Matches[3]
    }

    return [PSCustomObject]@{
        TotalPssKB = $totalPssKB
        TotalRssKB = $totalRssKB
        TotalSwapPssKB = $totalSwapPssKB
        TotalPssMB = Convert-KBToMB $totalPssKB
        TotalRssMB = Convert-KBToMB $totalRssKB
        TotalSwapPssMB = Convert-KBToMB $totalSwapPssKB
    }
}

function Get-AndroidGfxMetrics {
    param([string]$Path)

    $text = if (Test-Path -LiteralPath $Path) { Get-Content -LiteralPath $Path -Raw } else { "" }
    $totalFrames = $null
    $jankyFrames = $null
    $jankyPercent = $null
    $frameP95Ms = $null
    $frameP99Ms = $null
    $gpuP95Ms = $null

    if ($text -match "Total frames rendered:\s+(\d+)") {
        $totalFrames = [int]$Matches[1]
    }
    if ($text -match "Janky frames:\s+(\d+)\s+\(([\d.]+)%\)") {
        $jankyFrames = [int]$Matches[1]
        $jankyPercent = [double]$Matches[2]
    }
    if ($text -match "95th percentile:\s+(\d+)ms") {
        $frameP95Ms = [int]$Matches[1]
    }
    if ($text -match "99th percentile:\s+(\d+)ms") {
        $frameP99Ms = [int]$Matches[1]
    }
    if ($text -match "95th gpu percentile:\s+(\d+)ms") {
        $gpuP95Ms = [int]$Matches[1]
    }

    $sampleUsable = $false
    if ($null -ne $totalFrames -and $totalFrames -ge $MinGfxFramesForPacing) {
        $sampleUsable = $true
    }

    return [PSCustomObject]@{
        TotalFrames = $totalFrames
        JankyFrames = $jankyFrames
        JankyPercent = $jankyPercent
        FrameP95Ms = $frameP95Ms
        FrameP99Ms = $frameP99Ms
        GpuP95Ms = $gpuP95Ms
        FramePacingSampleUsable = $sampleUsable
    }
}

function Get-Percentile {
    param(
        [double[]]$Values,
        [double]$Percentile
    )

    if ($null -eq $Values -or $Values.Count -eq 0) {
        return $null
    }

    $sorted = @($Values | Sort-Object)
    $index = [Math]::Ceiling(($Percentile / 100.0) * $sorted.Count) - 1
    $index = [Math]::Max(0, [Math]::Min($sorted.Count - 1, $index))
    return [Math]::Round([double]$sorted[$index], 2)
}

function Read-UnrealCsvLines {
    param([string]$Path)

    if ($Path.EndsWith(".gz", [StringComparison]::OrdinalIgnoreCase)) {
        $fileStream = [IO.File]::OpenRead($Path)
        $gzipStream = [IO.Compression.GZipStream]::new($fileStream, [IO.Compression.CompressionMode]::Decompress)
        $reader = [IO.StreamReader]::new($gzipStream, [Text.Encoding]::UTF8)
        try {
            return (($reader.ReadToEnd()) -split "`r?`n")
        }
        finally {
            $reader.Dispose()
            $gzipStream.Dispose()
            $fileStream.Dispose()
        }
    }

    return @(Get-Content -LiteralPath $Path)
}

function Get-UnrealCsvMetrics {
    param([string]$Directory)

    $empty = [PSCustomObject]@{
        FilePath = ""
        FileName = ""
        FrameTimeColumn = ""
        TotalFrameCount = 0
        DroppedInitialFrameCount = 0
        FrameCount = 0
        AverageFrameMs = $null
        FrameP50Ms = $null
        FrameP95Ms = $null
        FrameP99Ms = $null
        FrameMaxMs = $null
        FramePacingSampleUsable = $false
        ParseError = ""
    }

    if (-not (Test-Path -LiteralPath $Directory)) {
        return $empty
    }

    $files = @(
        Get-ChildItem -LiteralPath $Directory -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match "\.csv(\.gz)?$" } |
            Sort-Object LastWriteTime -Descending
    )

    if ($files.Count -eq 0) {
        return $empty
    }

    $lastError = ""
    foreach ($file in $files) {
        try {
            $lines = @(Read-UnrealCsvLines -Path $file.FullName)
            $headerIndex = -1
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "(^|,)FrameTime(,|$)" -or $lines[$i] -match "/FrameTime(,|$)") {
                    $headerIndex = $i
                    break
                }
            }

            if ($headerIndex -lt 0) {
                $lastError = "FrameTime column was not found in $($file.Name)"
                continue
            }

            $columns = @($lines[$headerIndex] -split ",")
            $frameColumnIndex = -1
            for ($i = 0; $i -lt $columns.Count; $i++) {
                $columnName = $columns[$i].Trim().Trim('"')
                if ($columnName -eq "FrameTime" -or $columnName.EndsWith("/FrameTime", [StringComparison]::OrdinalIgnoreCase)) {
                    $frameColumnIndex = $i
                    break
                }
            }

            if ($frameColumnIndex -lt 0) {
                $lastError = "FrameTime column index was not found in $($file.Name)"
                continue
            }

            $values = New-Object System.Collections.Generic.List[double]
            for ($i = $headerIndex + 1; $i -lt $lines.Count; $i++) {
                $line = $lines[$i]
                if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("[")) {
                    continue
                }

                $cells = @($line -split ",")
                if ($cells.Count -le $frameColumnIndex) {
                    continue
                }

                $rawValue = $cells[$frameColumnIndex].Trim().Trim('"')
                $parsed = 0.0
                if ([double]::TryParse($rawValue, [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) {
                    if (-not [double]::IsNaN($parsed) -and -not [double]::IsInfinity($parsed)) {
                        $values.Add($parsed)
                    }
                }
            }

            if ($values.Count -eq 0) {
                $lastError = "No numeric FrameTime values were parsed in $($file.Name)"
                continue
            }

            $analysisValues = New-Object System.Collections.Generic.List[double]
            $analysisStartIndex = 0
            if ($CsvMetricWindowFrames -gt 0 -and $values.Count -gt $CsvMetricWindowFrames) {
                $analysisStartIndex = $values.Count - $CsvMetricWindowFrames
            }
            for ($i = $analysisStartIndex; $i -lt $values.Count; $i++) {
                $analysisValues.Add($values[$i])
            }

            $average = ($analysisValues | Measure-Object -Average).Average
            $max = ($analysisValues | Measure-Object -Maximum).Maximum

            return [PSCustomObject]@{
                FilePath = $file.FullName
                FileName = $file.Name
                FrameTimeColumn = $columns[$frameColumnIndex].Trim().Trim('"')
                TotalFrameCount = $values.Count
                DroppedInitialFrameCount = $analysisStartIndex
                FrameCount = $analysisValues.Count
                AverageFrameMs = [Math]::Round([double]$average, 2)
                FrameP50Ms = Get-Percentile -Values $analysisValues.ToArray() -Percentile 50
                FrameP95Ms = Get-Percentile -Values $analysisValues.ToArray() -Percentile 95
                FrameP99Ms = Get-Percentile -Values $analysisValues.ToArray() -Percentile 99
                FrameMaxMs = [Math]::Round([double]$max, 2)
                FramePacingSampleUsable = ($analysisValues.Count -ge $MinCsvFramesForPacing)
                ParseError = ""
            }
        }
        catch {
            $lastError = $_.Exception.Message
        }
    }

    $empty.ParseError = $lastError
    return $empty
}

function Get-PreferredHostIPv4 {
    $candidate = Get-NetIPConfiguration |
        Where-Object { $null -ne $_.IPv4DefaultGateway -and $null -ne $_.IPv4Address } |
        Select-Object -First 1

    if ($null -eq $candidate -or $null -eq $candidate.IPv4Address) {
        throw "Could not infer a LAN IPv4 address. Pass -ServerAddress explicitly, for example 192.168.1.10:7777."
    }

    return ($candidate.IPv4Address | Select-Object -First 1).IPAddress
}

function Stop-CliffwaldProcesses {
    Get-Process Cliffwald, CliffwaldServer -ErrorAction SilentlyContinue | Stop-Process -Force
}

if (-not (Test-Path -LiteralPath $ApkPath)) {
    throw "Android APK not found: $ApkPath"
}

$androidSdk = if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$aaptFallbacks = @()
if (Test-Path -LiteralPath (Join-Path $androidSdk "build-tools")) {
    $aaptFallbacks = Get-ChildItem -LiteralPath (Join-Path $androidSdk "build-tools") -Recurse -Filter "aapt.exe" -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -ExpandProperty FullName
}

$adb = Resolve-Executable -RequestedPath $AdbPath -CommandName "adb" -Fallbacks @((Join-Path $androidSdk "platform-tools\adb.exe"))
$aapt = Resolve-Executable -RequestedPath $AaptPath -CommandName "aapt" -Fallbacks $aaptFallbacks

$badging = Invoke-External -FilePath $aapt -Arguments @("dump", "badging", $ApkPath)
$badgingText = $badging -join "`n"
if (-not ($badgingText -match "package: name='([^']+)'")) {
    throw "Could not read package name from APK badging"
}
$packageName = $Matches[1]

if ($packageName -ne $ExpectedPackageName) {
    throw "Android package name is '$packageName', expected '$ExpectedPackageName'"
}

if ($badgingText -match "com\.YourCompany") {
    throw "Android APK still contains the Unreal placeholder package namespace"
}

if (-not ($badgingText -match "launchable-activity: name='([^']+)'")) {
    throw "Could not read launchable activity from APK badging"
}
$launchActivity = $Matches[1]

$deviceOutput = Invoke-External -FilePath $adb -Arguments @("devices", "-l")
$devices = @()
foreach ($line in $deviceOutput) {
    if ([string]::IsNullOrWhiteSpace($line) -or $line -match "^List of devices") {
        continue
    }
    if ($line -match "^(\S+)\s+(\S+)(.*)$") {
        $devices += [PSCustomObject]@{
            Serial = $Matches[1]
            State = $Matches[2]
            Details = $Matches[3].Trim()
        }
    }
}

if ($devices.Count -eq 0) {
    throw "No Android device or emulator is connected. Enable USB debugging, authorize the computer, then rerun this script."
}

if (-not [string]::IsNullOrWhiteSpace($DeviceSerial)) {
    $device = $devices | Where-Object { $_.Serial -eq $DeviceSerial } | Select-Object -First 1
    if ($null -eq $device) {
        throw "Requested Android device was not found: $DeviceSerial"
    }
}
else {
    $readyDevices = @($devices | Where-Object { $_.State -eq "device" })
    if ($readyDevices.Count -ne 1) {
        $summary = ($devices | ForEach-Object { "$($_.Serial):$($_.State)" }) -join ", "
        throw "Expected exactly one authorized Android device. Found: $summary. Pass -DeviceSerial to choose one."
    }
    $device = $readyDevices[0]
}

if ($device.State -ne "device") {
    throw "Android device $($device.Serial) is not ready. Current adb state: $($device.State)."
}

$logsDir = Join-Path $ProjectRoot "Saved\Logs"
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
$logcatPath = Join-Path $logsDir "CliffwaldAndroidLogcat.log"
$androidUeLogPath = Join-Path $logsDir "CliffwaldAndroidDevice.log"
$meminfoPath = Join-Path $logsDir "CliffwaldAndroidMeminfo.txt"
$gfxinfoPath = Join-Path $logsDir "CliffwaldAndroidGfxinfo.txt"
$metricsJsonPath = Join-Path $logsDir "CliffwaldAndroidMetrics.json"
$serverLog = Join-Path $logsDir "CliffwaldAndroidServer.log"
$androidCsvPullRoot = Join-Path $logsDir "AndroidCsv"

$server = $null
$resolvedServerAddress = $ServerAddress
$unrealCsvProfileEnabled = -not $SkipUnrealCsvProfile

try {
    if ($StartLocalServer) {
        if ([string]::IsNullOrWhiteSpace($resolvedServerAddress)) {
            $hostAddress = if ($device.Serial -like "emulator-*") { "10.0.2.2" } else { Get-PreferredHostIPv4 }
            $resolvedServerAddress = "${hostAddress}:$Port"
        }

        Stop-CliffwaldProcesses
        Remove-Item -LiteralPath $serverLog -ErrorAction SilentlyContinue
        $server = & (Join-Path $PSScriptRoot "Start-DedicatedServer.ps1") -Port $Port -LogPath $serverLog
        Start-Sleep -Seconds 12

        $endpoint = Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object LocalPort -EQ $Port
        if ($null -eq $endpoint) {
            throw "Dedicated server did not open UDP port $Port"
        }
    }

    if (-not $SkipInstall) {
        Invoke-External -FilePath $adb -Arguments @("-s", $device.Serial, "install", "-r", "-d", "-g", $ApkPath) | Out-Null
    }

    $commandLineParts = @()
    if (-not [string]::IsNullOrWhiteSpace($resolvedServerAddress)) {
        $commandLineParts += $resolvedServerAddress
    }
    $commandLineParts += @("-log", "-nosound")

    if ($unrealCsvProfileEnabled) {
        $commandLineParts += "-CliffwaldCsvCaptureFrames=$CsvCaptureFrames"
        $commandLineParts += "-CliffwaldCsvCaptureDelaySeconds=$CsvCaptureDelaySeconds"
        if ($EnableUnrealCsvGpuStats) {
            $commandLineParts += "-csvGpuStats"
        }
    }

    $commandLine = $commandLineParts -join " "

    $tempCommandPath = Join-Path ([IO.Path]::GetTempPath()) "Cliffwald-UECommandLine.txt"
    Set-Content -LiteralPath $tempCommandPath -Value $commandLine -Encoding ASCII

    $deviceCommandDirs = @(
        "/sdcard/Android/data/$packageName/files/UnrealGame/$ProjectName",
        "/sdcard/UnrealGame/$ProjectName"
    )
    $deviceSavedRoots = @(
        "/sdcard/Android/data/$packageName/files/UnrealGame/$ProjectName/$ProjectName",
        "/sdcard/Android/data/$packageName/files/UnrealGame/$ProjectName",
        "/sdcard/UnrealGame/$ProjectName/$ProjectName",
        "/sdcard/UnrealGame/$ProjectName"
    )
    $deviceCsvDirs = @($deviceSavedRoots | ForEach-Object { "$_/Saved/Profiling/CSV" })

    foreach ($deviceCommandDir in $deviceCommandDirs) {
        $deviceCommandPath = "$deviceCommandDir/UECommandLine.txt"
        Invoke-External -FilePath $adb -Arguments @("-s", $device.Serial, "shell", "mkdir", "-p", $deviceCommandDir) | Out-Null
        Invoke-External -FilePath $adb -Arguments @("-s", $device.Serial, "push", $tempCommandPath, $deviceCommandPath) | Out-Null
    }

    if ($unrealCsvProfileEnabled) {
        foreach ($deviceCsvDir in $deviceCsvDirs) {
            Invoke-ExternalOptional -FilePath $adb -Arguments @("-s", $device.Serial, "shell", "rm", "-rf", $deviceCsvDir) | Out-Null
        }
    }

    Invoke-External -FilePath $adb -Arguments @("-s", $device.Serial, "logcat", "-c") | Out-Null
    Invoke-External -FilePath $adb -Arguments @("-s", $device.Serial, "shell", "am", "force-stop", $packageName) | Out-Null
    $quotedCommandLine = Quote-AndroidShellValue -Value $commandLine

    $componentName = "$packageName/$launchActivity"
    $launchOutput = Invoke-External -FilePath $adb -Arguments @("-s", $device.Serial, "shell", "am start -W -n $componentName --es cmdline $quotedCommandLine")
    Start-Sleep -Seconds $WarmupSeconds

    $pidOutput = & $adb -s $device.Serial shell pidof $packageName 2>$null
    $appPid = (($pidOutput | Select-Object -First 1) -split "\s+" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -First 1)

    $logcatArgs = @("-s", $device.Serial, "logcat", "-d", "-v", "time")
    if (-not [string]::IsNullOrWhiteSpace($appPid)) {
        $logcatArgs += "--pid=$appPid"
    }
    $logcat = Invoke-External -FilePath $adb -Arguments $logcatArgs
    $logcat | Set-Content -LiteralPath $logcatPath -Encoding UTF8

    $pulledUeLog = $false
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        foreach ($deviceSavedRoot in $deviceSavedRoots) {
            $deviceUeLogPath = "$deviceSavedRoot/Saved/Logs/$ProjectName.log"
            & $adb -s $device.Serial pull $deviceUeLogPath $androidUeLogPath *> $null
            if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $androidUeLogPath)) {
                $pulledUeLog = $true
                break
            }
        }
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    $meminfo = Invoke-External -FilePath $adb -Arguments @("-s", $device.Serial, "shell", "dumpsys", "meminfo", $packageName)
    $meminfo | Set-Content -LiteralPath $meminfoPath -Encoding UTF8

    $gfxinfo = Invoke-External -FilePath $adb -Arguments @("-s", $device.Serial, "shell", "dumpsys", "gfxinfo", $packageName, "framestats")
    $gfxinfo | Set-Content -LiteralPath $gfxinfoPath -Encoding UTF8
    $memMetrics = Get-AndroidMemMetrics -Path $meminfoPath
    $gfxMetrics = Get-AndroidGfxMetrics -Path $gfxinfoPath
    $csvMetrics = Get-UnrealCsvMetrics -Directory $androidCsvPullRoot

    if ($unrealCsvProfileEnabled) {
        for ($attempt = 1; $attempt -le 8; $attempt++) {
            if (Test-Path -LiteralPath $androidCsvPullRoot) {
                Remove-Item -LiteralPath $androidCsvPullRoot -Recurse -Force
            }
            New-Item -ItemType Directory -Force -Path $androidCsvPullRoot | Out-Null

            for ($i = 0; $i -lt $deviceCsvDirs.Count; $i++) {
                $targetDir = Join-Path $androidCsvPullRoot ("Source{0}" -f $i)
                New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
                Invoke-ExternalOptional -FilePath $adb -Arguments @("-s", $device.Serial, "pull", $deviceCsvDirs[$i], $targetDir) | Out-Null
            }

            $csvMetrics = Get-UnrealCsvMetrics -Directory $androidCsvPullRoot
            if ($csvMetrics.FrameCount -gt 0) {
                break
            }

            Start-Sleep -Seconds 2
        }
    }

    $androidBad = Count-Matches $logcatPath "FATAL EXCEPTION|Fatal signal|ANR in|Input dispatching timed out|Process .* has crashed|Fatal error|Project file not found|OBB not found"
    $androidEngineInitialized = Count-Matches $logcatPath "Engine is initialized|Game Engine Initialized|FEngineLoop::Init"
    $ueBad = Count-Matches $androidUeLogPath "Ensure condition failed|Handled ensure|Fatal|Error:"
    $serverJoinSucceeded = if ($StartLocalServer) { Count-Matches $serverLog "Join succeeded" } else { 0 }
    $serverBad = if ($StartLocalServer) { Count-Matches $serverLog "Ensure condition failed|Handled ensure|Fatal|Error:|missing CliffwaldPrototypeWorld" } else { 0 }

    $result = [PSCustomObject]@{
        DeviceSerial = $device.Serial
        DeviceDetails = $device.Details
        PackageName = $packageName
        ExpectedPackageName = $ExpectedPackageName
        PackageNameMatches = ($packageName -eq $ExpectedPackageName)
        LaunchActivity = $launchActivity
        ApkPath = $ApkPath
        CommandLine = $commandLine
        StartedPid = $appPid
        LaunchOutput = ($launchOutput -join " | ")
        AndroidBadCount = $androidBad
        AndroidEngineInitialized = $androidEngineInitialized
        UeLogPulled = $pulledUeLog
        UeBadCount = $ueBad
        ServerAddress = $resolvedServerAddress
        ServerJoinSucceeded = $serverJoinSucceeded
        ServerBadCount = $serverBad
        TotalPssMB = $memMetrics.TotalPssMB
        TotalRssMB = $memMetrics.TotalRssMB
        TotalSwapPssMB = $memMetrics.TotalSwapPssMB
        MaxTotalPssMB = $MaxTotalPssMB
        MaxTotalRssMB = $MaxTotalRssMB
        MaxSwapPssMB = $MaxSwapPssMB
        UnrealCsvProfileEnabled = $unrealCsvProfileEnabled
        UnrealCsvPath = $csvMetrics.FilePath
        UnrealCsvFrameTimeColumn = $csvMetrics.FrameTimeColumn
        UnrealCsvTotalFrameCount = $csvMetrics.TotalFrameCount
        UnrealCsvDroppedInitialFrameCount = $csvMetrics.DroppedInitialFrameCount
        UnrealCsvFrameCount = $csvMetrics.FrameCount
        UnrealCsvAverageFrameMs = $csvMetrics.AverageFrameMs
        UnrealCsvFrameP50Ms = $csvMetrics.FrameP50Ms
        UnrealCsvFrameP95Ms = $csvMetrics.FrameP95Ms
        UnrealCsvFrameP99Ms = $csvMetrics.FrameP99Ms
        UnrealCsvFrameMaxMs = $csvMetrics.FrameMaxMs
        UnrealCsvFramePacingSampleUsable = $csvMetrics.FramePacingSampleUsable
        UnrealCsvParseError = $csvMetrics.ParseError
        CsvCaptureFrames = $CsvCaptureFrames
        CsvCaptureDelaySeconds = $CsvCaptureDelaySeconds
        CsvMetricWindowFrames = $CsvMetricWindowFrames
        MinCsvFramesForPacing = $MinCsvFramesForPacing
        MaxCsvFrameP95Ms = $MaxCsvFrameP95Ms
        MaxCsvFrameP99Ms = $MaxCsvFrameP99Ms
        GfxTotalFrames = $gfxMetrics.TotalFrames
        GfxJankyPercent = $gfxMetrics.JankyPercent
        GfxFrameP95Ms = $gfxMetrics.FrameP95Ms
        GfxGpuP95Ms = $gfxMetrics.GpuP95Ms
        GfxFramePacingSampleUsable = $gfxMetrics.FramePacingSampleUsable
        FramePacingEvidenceSource = if ($csvMetrics.FramePacingSampleUsable) { "UnrealCsvProfiler" } elseif ($gfxMetrics.FramePacingSampleUsable) { "AndroidGfxInfo" } else { "" }
        LogcatPath = $logcatPath
        AndroidUeLogPath = $androidUeLogPath
        MeminfoPath = $meminfoPath
        GfxinfoPath = $gfxinfoPath
        UnrealCsvPullRoot = $androidCsvPullRoot
        MetricsJsonPath = $metricsJsonPath
        ServerLog = if ($StartLocalServer) { $serverLog } else { "" }
    }

    [IO.File]::WriteAllText($metricsJsonPath, ($result | ConvertTo-Json -Depth 4), [Text.UTF8Encoding]::new($false))
    $result | Format-List

    if ([string]::IsNullOrWhiteSpace($appPid)) {
        throw "Android app did not remain running after warmup"
    }
    if ($androidEngineInitialized -lt 1) {
        throw "Android app launched but UE engine initialization was not observed in logcat"
    }
    if ($androidBad -ne 0 -or $ueBad -ne 0 -or $serverBad -ne 0) {
        throw "Android device smoke detected runtime errors"
    }
    if ($null -eq $memMetrics.TotalPssMB -or $null -eq $memMetrics.TotalRssMB -or $null -eq $memMetrics.TotalSwapPssMB) {
        throw "Android meminfo metrics could not be parsed"
    }
    if ($memMetrics.TotalPssMB -gt $MaxTotalPssMB) {
        throw "Android Total PSS $($memMetrics.TotalPssMB) MB exceeds budget $MaxTotalPssMB MB"
    }
    if ($memMetrics.TotalRssMB -gt $MaxTotalRssMB) {
        throw "Android Total RSS $($memMetrics.TotalRssMB) MB exceeds budget $MaxTotalRssMB MB"
    }
    if ($memMetrics.TotalSwapPssMB -gt $MaxSwapPssMB) {
        throw "Android Total Swap PSS $($memMetrics.TotalSwapPssMB) MB exceeds budget $MaxSwapPssMB MB"
    }
    if ($RequireUnrealCsvProfile -and -not $csvMetrics.FramePacingSampleUsable) {
        $detail = if ([string]::IsNullOrWhiteSpace($csvMetrics.ParseError)) { "no CSV FrameTime sample was parsed" } else { $csvMetrics.ParseError }
        throw "Unreal CSV profiler sample is not usable: $detail"
    }
    if ($RequireFramePacingSample -and -not ($gfxMetrics.FramePacingSampleUsable -or $csvMetrics.FramePacingSampleUsable)) {
        throw "Android frame pacing sample is too small: gfxinfo=$($gfxMetrics.TotalFrames) frames, UnrealCSV=$($csvMetrics.FrameCount) frames"
    }
    if ($gfxMetrics.FramePacingSampleUsable) {
        if ($null -eq $gfxMetrics.JankyPercent -or $null -eq $gfxMetrics.FrameP95Ms) {
            throw "Android gfxinfo frame pacing metrics could not be parsed"
        }
        if ($gfxMetrics.JankyPercent -gt $MaxJankyFramePercent) {
            throw "Android janky frame percent $($gfxMetrics.JankyPercent)% exceeds budget $MaxJankyFramePercent%"
        }
        if ($gfxMetrics.FrameP95Ms -gt $MaxFrameP95Ms) {
            throw "Android frame p95 $($gfxMetrics.FrameP95Ms) ms exceeds budget $MaxFrameP95Ms ms"
        }
    }
    if ($csvMetrics.FramePacingSampleUsable) {
        if ($csvMetrics.FrameP95Ms -gt $MaxCsvFrameP95Ms) {
            throw "Unreal CSV FrameTime p95 $($csvMetrics.FrameP95Ms) ms exceeds budget $MaxCsvFrameP95Ms ms"
        }
        if ($csvMetrics.FrameP99Ms -gt $MaxCsvFrameP99Ms) {
            throw "Unreal CSV FrameTime p99 $($csvMetrics.FrameP99Ms) ms exceeds budget $MaxCsvFrameP99Ms ms"
        }
    }
    if ($StartLocalServer -and $serverJoinSucceeded -lt 1) {
        throw "Android device did not join the local dedicated server"
    }
}
finally {
    if (-not $KeepRunning -and $null -ne $device) {
        & $adb -s $device.Serial shell am force-stop $packageName *> $null
    }
    if (-not $KeepRunning -and $null -ne $server) {
        Stop-CliffwaldProcesses
    }
}
