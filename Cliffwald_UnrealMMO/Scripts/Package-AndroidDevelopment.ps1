param(
    [string]$SourceRoot = "D:\UnrealEngine-5.8-source",
    [string]$ProjectPath = "",
    [string]$ArchiveDirectory = "",
    [string]$Map = "/Game/Maps/L_CliffwaldPrototype",
    [switch]$KeepAndroidGenerated
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
    $ProjectPath = Join-Path $ProjectRoot "Cliffwald.uproject"
}

if ([string]::IsNullOrWhiteSpace($ArchiveDirectory)) {
    $ArchiveDirectory = Join-Path $ProjectRoot "PackagedAndroid"
}

$androidSdk = if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$ndkRoot = Join-Path $androidSdk "ndk\27.2.12479018"
if (-not (Test-Path -LiteralPath $ndkRoot)) {
    throw "Required Unreal Android NDK not found: $ndkRoot"
}

$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk
$env:NDKROOT = $ndkRoot
$env:NDK_ROOT = $ndkRoot

$androidStudioJavaHome = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path -LiteralPath (Join-Path $androidStudioJavaHome "bin\java.exe")) {
    $gradleJavaHome = Join-Path $env:LOCALAPPDATA "Cliffwald\AndroidStudioJbr"
    if (-not (Test-Path -LiteralPath (Join-Path $gradleJavaHome "bin\java.exe"))) {
        New-Item -ItemType Junction -Path $gradleJavaHome -Target $androidStudioJavaHome -Force | Out-Null
    }

    $env:JAVA_HOME = $gradleJavaHome
    $env:Path = (Join-Path $gradleJavaHome "bin") + [IO.Path]::PathSeparator + $env:Path
    $env:GRADLE_OPTS = "-Dorg.gradle.java.home=$gradleJavaHome " + $env:GRADLE_OPTS
}

$gradleUserHome = Join-Path $env:LOCALAPPDATA "Cliffwald\GradleCache"
New-Item -ItemType Directory -Force -Path $gradleUserHome | Out-Null
$env:GRADLE_USER_HOME = $gradleUserHome

$androidIntermediate = Join-Path $ProjectRoot "Intermediate\Android"
$androidGeneratedSource = Join-Path $ProjectRoot "Build\Android\src"
if (-not $KeepAndroidGenerated) {
    foreach ($generatedPath in @($androidIntermediate, $androidGeneratedSource)) {
        if (Test-Path -LiteralPath $generatedPath) {
            Remove-Item -LiteralPath $generatedPath -Recurse -Force
        }
    }
}
elseif (Test-Path -LiteralPath $androidIntermediate) {
    Get-ChildItem -LiteralPath $androidIntermediate -Directory -Recurse -Force -Filter ".gradle" -ErrorAction SilentlyContinue |
        ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
}

$runUat = Join-Path $SourceRoot "Engine\Build\BatchFiles\RunUAT.bat"
if (-not (Test-Path -LiteralPath $runUat)) {
    throw "RunUAT not found at $runUat"
}

& $runUat `
    BuildCookRun `
    "-project=$ProjectPath" `
    -noP4 `
    "-clientconfig=Development" `
    "-targetplatform=Android" `
    -NoUBA `
    -ForcePackageData `
    -build `
    -cook `
    "-map=$Map" `
    -stage `
    -package `
    -pak `
    -archive `
    "-archivedirectory=$ArchiveDirectory"

if ($LASTEXITCODE -ne 0) {
    throw "Android package failed with exit code $LASTEXITCODE"
}

Get-ChildItem -LiteralPath $ArchiveDirectory -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in @(".apk", ".aab") } |
    Select-Object FullName, Length, LastWriteTime |
    Format-Table -AutoSize

$apk = Get-ChildItem -LiteralPath $ArchiveDirectory -Recurse -File -Filter "*.apk" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if ($null -ne $apk) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($apk.FullName)
    try {
        $contentEntries = @(
            $zip.Entries |
                Where-Object { $_.FullName -match "\.(pak|utoc|ucas|obb)(\.png)?$" -or $_.FullName -match "main\..*\.obb" } |
                Select-Object FullName, Length
        )

        if ($contentEntries.Count -eq 0) {
            throw "Packaged APK does not contain cooked UE content (.pak/.utoc/.ucas/.obb): $($apk.FullName)"
        }

        $contentEntries | Format-Table -AutoSize
    }
    finally {
        $zip.Dispose()
    }
}
