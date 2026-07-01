param(
    [switch]$PackageAndroid,
    [switch]$RunAndroidDevice,
    [switch]$RunSoak,
    [switch]$RunPerf,
    [switch]$SkipRuntimeSmokes,
    [switch]$SkipUnrealAutomation,
    [string]$ExpectedAndroidPackageName = "com.cliffwald.online",
    [int]$ExpectedAndroidTargetSdkVersion = 35,
    [int]$AndroidDeviceWarmupSeconds = 100
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ApkPath = Join-Path $ProjectRoot "PackagedAndroid\Android\Cliffwald-arm64.apk"
$Failures = @()

function Invoke-GateStep {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    Write-Host ""
    Write-Host "== $Name =="

    try {
        & $Action | Out-Host
        [PSCustomObject]@{
            Step = $Name
            Status = "PASS"
            Detail = ""
        }
    }
    catch {
        $script:Failures += $Name
        [PSCustomObject]@{
            Step = $Name
            Status = "FAIL"
            Detail = $_.Exception.Message
        }
    }
}

function Resolve-AaptPath {
    $androidSdk = if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
    $aapt = Get-ChildItem -LiteralPath (Join-Path $androidSdk "build-tools") -Recurse -Filter "aapt.exe" -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1

    if ($null -eq $aapt) {
        throw "aapt.exe was not found under $androidSdk\build-tools"
    }

    return $aapt.FullName
}

function Test-ApkContainsCookedContent {
    param([string]$Path)

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $contentEntries = @(
            $zip.Entries |
                Where-Object { $_.FullName -match "\.(pak|utoc|ucas|obb)(\.png)?$" -or $_.FullName -match "main\..*\.obb" } |
                Select-Object FullName, Length
        )

        if ($contentEntries.Count -eq 0) {
            throw "Android APK does not contain cooked UE content (.pak/.utoc/.ucas/.obb). The app may launch its Activity without loading the game."
        }

        $contentEntries | Format-Table -AutoSize
    }
    finally {
        $zip.Dispose()
    }
}

$results = @()

$results += Invoke-GateStep "Android toolchain preflight" {
    & (Join-Path $PSScriptRoot "Test-MobileToolchain.ps1") -RequireAndroid
}

$results += Invoke-GateStep "Vertical slice guardrails" {
    & (Join-Path $PSScriptRoot "Test-VerticalSliceGuardrails.ps1")
}

if (-not $SkipUnrealAutomation) {
    $results += Invoke-GateStep "Unreal automation tests" {
        & (Join-Path $PSScriptRoot "Test-UnrealAutomation.ps1")
    }
}

if ($PackageAndroid) {
    $results += Invoke-GateStep "Android Development package" {
        & (Join-Path $PSScriptRoot "Package-AndroidDevelopment.ps1")
    }
}

$results += Invoke-GateStep "Android APK metadata" {
    if (-not (Test-Path -LiteralPath $ApkPath)) {
        throw "Android APK not found: $ApkPath"
    }

    $aapt = Resolve-AaptPath
    $badging = & $aapt dump badging $ApkPath 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "aapt badging failed: $($badging -join "`n")"
    }

    $badgingText = $badging -join "`n"
    if (-not ($badgingText -match "package: name='([^']+)'")) {
        throw "Could not parse Android package name"
    }
    $packageName = $Matches[1]

    if ($packageName -ne $ExpectedAndroidPackageName) {
        throw "Android package name is '$packageName', expected '$ExpectedAndroidPackageName'"
    }

    if (-not ($badgingText -match "targetSdkVersion:'([^']+)'")) {
        throw "Could not parse Android target SDK version"
    }
    $targetSdkVersion = [int]$Matches[1]
    if ($targetSdkVersion -ne $ExpectedAndroidTargetSdkVersion) {
        throw "Android target SDK is '$targetSdkVersion', expected '$ExpectedAndroidTargetSdkVersion'"
    }

    if (-not ($badgingText -match "native-code: 'arm64-v8a'")) {
        throw "Android APK is not arm64-v8a"
    }

    if ($badgingText -match "com\.YourCompany") {
        throw "Android APK still contains the Unreal placeholder package namespace"
    }

    Test-ApkContainsCookedContent -Path $ApkPath
    Get-Item -LiteralPath $ApkPath | Select-Object FullName, Length, LastWriteTime
}

if (-not $SkipRuntimeSmokes) {
    $results += Invoke-GateStep "Dedicated server online smoke" {
        & (Join-Path $PSScriptRoot "Test-DedicatedServer.ps1")
    }

    $results += Invoke-GateStep "Autonomous zero-player school smoke" {
        & (Join-Path $PSScriptRoot "Test-AutonomousSchool.ps1")
    }
}

if ($RunSoak) {
    $results += Invoke-GateStep "Server reconnect soak" {
        & (Join-Path $PSScriptRoot "Test-ServerSoak.ps1")
    }
}

if ($RunPerf) {
    $results += Invoke-GateStep "Server autonomous perf" {
        & (Join-Path $PSScriptRoot "Test-ServerPerf.ps1")
    }
}

if ($RunAndroidDevice) {
    $results += Invoke-GateStep "Android device online smoke" {
        & (Join-Path $PSScriptRoot "Test-AndroidDevice.ps1") -StartLocalServer -WarmupSeconds $AndroidDeviceWarmupSeconds -RequireUnrealCsvProfile -RequireFramePacingSample
    }
}

Write-Host ""
Write-Host "== Technical demo gate summary =="
$results | Format-Table -AutoSize

if ($Failures.Count -gt 0) {
    throw "Technical demo gate failed: $($Failures -join ', ')"
}
