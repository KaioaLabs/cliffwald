param(
    [switch]$RequireAndroid,
    [switch]$RequireIOS
)

$ErrorActionPreference = "Stop"

function Test-CommandExists {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-PathExists {
    param([string]$Path)
    return -not [string]::IsNullOrWhiteSpace($Path) -and (Test-Path -LiteralPath $Path)
}

function Get-JavaMajorVersion {
    param([string]$JavaExe)
    if (-not (Test-PathExists $JavaExe)) {
        return 0
    }

    $processInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $processInfo.FileName = $JavaExe
    $processInfo.Arguments = "-version"
    $processInfo.RedirectStandardError = $true
    $processInfo.RedirectStandardOutput = $true
    $processInfo.UseShellExecute = $false

    $process = [System.Diagnostics.Process]::Start($processInfo)
    $versionText = $process.StandardError.ReadLine()
    $process.WaitForExit()
    if ($versionText -match '"(?<version>\d+)(\.|\")') {
        return [int]$Matches.version
    }

    return 0
}

$androidSdk = if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
$platformToolsAdb = if (Test-PathExists $androidSdk) { Join-Path $androidSdk "platform-tools\adb.exe" } else { "" }
$ndkRoot = if (Test-PathExists $androidSdk) { Join-Path $androidSdk "ndk" } else { "" }
$androidStudioJavaHome = "C:\Program Files\Android\Android Studio\jbr"
$androidStudioJava = Join-Path $androidStudioJavaHome "bin\java.exe"
$effectiveJava = if (Test-PathExists $androidStudioJava) { $androidStudioJava } elseif (Test-CommandExists "java") { (Get-Command java).Source } else { "" }
$javaMajor = Get-JavaMajorVersion $effectiveJava

$androidPlatforms = @()
if (Test-PathExists (Join-Path $androidSdk "platforms")) {
    $androidPlatforms = Get-ChildItem -LiteralPath (Join-Path $androidSdk "platforms") -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name
}

$ndkVersions = @()
if (Test-PathExists $ndkRoot) {
    $ndkVersions = Get-ChildItem -LiteralPath $ndkRoot -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name
}

$result = [PSCustomObject]@{
    AndroidSdkRoot = $androidSdk
    AndroidSdkExists = Test-PathExists $androidSdk
    AndroidPlatforms = ($androidPlatforms -join ", ")
    AdbOnPath = Test-CommandExists "adb"
    AdbInSdk = Test-PathExists $platformToolsAdb
    JavaOnPath = Test-CommandExists "java"
    JavaHome = $env:JAVA_HOME
    AndroidStudioJavaHome = if (Test-PathExists $androidStudioJavaHome) { $androidStudioJavaHome } else { "" }
    EffectiveJava = $effectiveJava
    EffectiveJavaMajor = $javaMajor
    JavaCompatibleForUEGradle = $javaMajor -ge 17 -and $javaMajor -le 21
    AndroidNdkVersions = ($ndkVersions -join ", ")
    AndroidReadyForUE = (Test-PathExists $androidSdk) -and (Test-PathExists $platformToolsAdb) -and $ndkVersions.Count -gt 0 -and ($javaMajor -ge 17 -and $javaMajor -le 21)
    XcodebuildOnPath = Test-CommandExists "xcodebuild"
    IOSReadyForUE = Test-CommandExists "xcodebuild"
}

$result | Format-List

if ($RequireAndroid -and -not $result.AndroidReadyForUE) {
    throw "Android toolchain is incomplete for Unreal packaging."
}

if ($RequireIOS -and -not $result.IOSReadyForUE) {
    throw "iOS toolchain is incomplete for Unreal packaging."
}
