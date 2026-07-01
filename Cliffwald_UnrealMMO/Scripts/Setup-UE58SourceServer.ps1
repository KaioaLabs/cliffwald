param(
    [string]$SourceRoot = "D:\UnrealEngine-5.8-source",
    [string]$Branch = "5.8",
    [string]$ProjectPath = "",
    [int]$MinFreeGB = 250,
    [switch]$Clone,
    [switch]$Bootstrap,
    [switch]$BuildEditor,
    [switch]$BuildClient,
    [switch]$BuildServer,
    [switch]$CookClient,
    [switch]$CookServer,
    [switch]$NoUBA,
    [int]$MaxParallelActions = 0,
    [switch]$SkipGitHubAccessCheck
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
    $ProjectPath = Join-Path $ProjectRoot "Cliffwald.uproject"
}

function Test-CommandExists {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory
    )

    Write-Host "Running: $FilePath $($Arguments -join ' ')"
    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}

function Get-BuildExecutorArgs {
    $args = @()
    if ($NoUBA) {
        $args += "-NoUBA"
    }
    if ($MaxParallelActions -gt 0) {
        $args += "-MaxParallelActions=$MaxParallelActions"
    }
    return $args
}

function Get-UatExecutorArgs {
    $args = @()
    if ($NoUBA) {
        $args += "-NoUBA"
    }
    return $args
}

$sourceParent = Split-Path -Parent $SourceRoot
if ([string]::IsNullOrWhiteSpace($sourceParent)) {
    $sourceParent = $SourceRoot
}

if (Test-Path -LiteralPath $sourceParent) {
    $sourceParent = (Resolve-Path -LiteralPath $sourceParent).Path
}

$sourceDrive = [System.IO.Path]::GetPathRoot($sourceParent)

$driveInfo = [System.IO.DriveInfo]::new($sourceDrive)
$freeGB = [math]::Round($driveInfo.AvailableFreeSpace / 1GB, 2)
$ghExists = Test-CommandExists "gh"
$gitExists = Test-CommandExists "git"
$vsWhereExists = Test-Path -LiteralPath "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"

$githubAccess = $false
if ($ghExists -and -not $SkipGitHubAccessCheck) {
    $oldErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & gh repo view EpicGames/UnrealEngine --json nameWithOwner *>$null
        $githubAccess = $LASTEXITCODE -eq 0
    }
    finally {
        $ErrorActionPreference = $oldErrorActionPreference
    }
}
elseif ($SkipGitHubAccessCheck) {
    $githubAccess = $true
}

$sourceExists = Test-Path -LiteralPath (Join-Path $SourceRoot "Engine\Build\BatchFiles\Build.bat")

$preflight = [PSCustomObject]@{
    SourceRoot = $SourceRoot
    Branch = $Branch
    ProjectPath = $ProjectPath
    Drive = $driveInfo.Name
    FreeGB = $freeGB
    MinFreeGB = $MinFreeGB
    GitHubCli = $ghExists
    Git = $gitExists
    EpicUnrealGitHubAccess = $githubAccess
    VisualStudioInstaller = $vsWhereExists
    SourceBuildPresent = $sourceExists
}

$preflight | Format-List

if (($Clone -or $Bootstrap -or $BuildEditor -or $BuildClient -or $BuildServer -or $CookClient -or $CookServer) -and -not $gitExists) {
    throw "git is required."
}

if (($Clone -or $Bootstrap -or $BuildEditor -or $BuildClient -or $BuildServer -or $CookClient -or $CookServer) -and -not $githubAccess) {
    throw "No access to EpicGames/UnrealEngine. Link Epic and GitHub, then accept the @EpicGames GitHub invitation."
}

if (($Clone -or $Bootstrap -or $BuildEditor) -and $freeGB -lt $MinFreeGB) {
    throw "Not enough free space on $($driveInfo.Name). Free at least $MinFreeGB GB or pass -SourceRoot on a larger drive."
}

if ($Clone) {
    if (Test-Path -LiteralPath $SourceRoot) {
        $existingItems = Get-ChildItem -LiteralPath $SourceRoot -Force -ErrorAction SilentlyContinue
        if ($existingItems.Count -gt 0) {
            throw "SourceRoot already exists and is not empty: $SourceRoot"
        }
    }

    $cloneParent = Split-Path -Parent $SourceRoot
    if (-not (Test-Path -LiteralPath $cloneParent)) {
        New-Item -ItemType Directory -Force -Path $cloneParent | Out-Null
    }
    Invoke-Checked "gh" @("repo", "clone", "EpicGames/UnrealEngine", $SourceRoot, "--", "--branch", $Branch, "--single-branch") $cloneParent
    $sourceExists = $true
}

if (($Bootstrap -or $BuildEditor -or $BuildClient -or $BuildServer -or $CookClient -or $CookServer) -and -not (Test-Path -LiteralPath (Join-Path $SourceRoot "Setup.bat"))) {
    throw "Unreal source tree is not present at $SourceRoot"
}

if ($Bootstrap) {
    $setupArgs = @(
    "-exclude=TVOS",
    "-exclude=Linux",
    "-exclude=LinuxArm64",
    "-exclude=Mac",
    "-exclude=VisionOS"
    )
    Invoke-Checked (Join-Path $SourceRoot "Setup.bat") $setupArgs $SourceRoot
    Invoke-Checked (Join-Path $SourceRoot "GenerateProjectFiles.bat") @("-2022") $SourceRoot
}

$engineBuild = Join-Path $SourceRoot "Engine\Build\BatchFiles\Build.bat"
$runUat = Join-Path $SourceRoot "Engine\Build\BatchFiles\RunUAT.bat"

if ($BuildEditor) {
    Invoke-Checked $engineBuild (@("UE5Editor", "Win64", "Development", "-WaitMutex", "-NoHotReload", "-NoLiveCoding") + (Get-BuildExecutorArgs)) $SourceRoot
}

if ($BuildClient) {
    Invoke-Checked $engineBuild (@("Cliffwald", "Win64", "Development", "-Project=$ProjectPath", "-WaitMutex", "-NoHotReload", "-NoLiveCoding") + (Get-BuildExecutorArgs)) $ProjectRoot
}

if ($BuildServer) {
    Invoke-Checked $engineBuild (@("CliffwaldServer", "Win64", "Development", "-Project=$ProjectPath", "-WaitMutex", "-NoHotReload", "-NoLiveCoding") + (Get-BuildExecutorArgs)) $ProjectRoot
}

if ($CookClient) {
    $archiveDir = Join-Path $ProjectRoot "PackagedSourceClient"
    Invoke-Checked $runUat (@(
        "BuildCookRun",
        "-project=$ProjectPath",
        "-noP4",
        "-clientconfig=Development",
        "-targetplatform=Win64",
        "-build",
        "-cook",
        "-map=/Game/Maps/L_CliffwaldPrototype",
        "-stage",
        "-pak",
        "-archive",
        "-archivedirectory=$archiveDir"
    ) + (Get-UatExecutorArgs)) $ProjectRoot
}

if ($CookServer) {
    $archiveDir = Join-Path $ProjectRoot "PackagedServer"
    Invoke-Checked $runUat (@(
        "BuildCookRun",
        "-project=$ProjectPath",
        "-noP4",
        "-server",
        "-serverplatform=Win64",
        "-serverconfig=Development",
        "-noclient",
        "-build",
        "-cook",
        "-map=/Game/Maps/L_CliffwaldPrototype",
        "-stage",
        "-pak",
        "-archive",
        "-archivedirectory=$archiveDir"
    ) + (Get-UatExecutorArgs)) $ProjectRoot
}
