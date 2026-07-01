param(
    [switch]$Execute,
    [switch]$Deep
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$relativeTargets = @(
    "Saved",
    "Intermediate",
    "DerivedDataCache"
)

if ($Deep) {
    $relativeTargets += @(
        "Binaries",
        "Build",
        "Packaged",
        "PackagedAndroid",
        "PackagedServer",
        "PackagedSourceClient"
    )

    $pluginsRoot = Join-Path $ProjectRoot "Plugins"
    if (Test-Path -LiteralPath $pluginsRoot) {
        foreach ($pluginGeneratedDir in Get-ChildItem -LiteralPath $pluginsRoot -Directory -Recurse -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -in @("Binaries", "Intermediate") }) {
            $relativeTargets += $pluginGeneratedDir.FullName.Substring($ProjectRoot.Length).TrimStart("\")
        }
    }
}

function Get-DirectorySize {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return 0
    }

    $sum = Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum

    if ($null -eq $sum.Sum) {
        return 0
    }

    return [double]$sum.Sum
}

function Assert-UnderProjectRoot {
    param([string]$Path)

    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $rootWithSeparator = $ProjectRoot.TrimEnd("\") + "\"
    if (-not $fullPath.StartsWith($rootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to clean outside project root: $fullPath"
    }

    return $fullPath
}

$items = foreach ($relativeTarget in $relativeTargets) {
    $fullPath = Assert-UnderProjectRoot (Join-Path $ProjectRoot $relativeTarget)
    $bytes = Get-DirectorySize $fullPath

    [PSCustomObject]@{
        Path = $fullPath
        Exists = Test-Path -LiteralPath $fullPath
        SizeGB = [math]::Round($bytes / 1GB, 2)
    }
}

$items | Format-Table -AutoSize

$totalGB = [math]::Round((($items | Measure-Object -Property SizeGB -Sum).Sum), 2)
Write-Host "Potential reclaim: $totalGB GB"

if (-not $Execute) {
    Write-Host "Dry run only. Re-run with -Execute to remove these generated directories."
    return
}

foreach ($item in $items) {
    if ($item.Exists) {
        Remove-Item -LiteralPath $item.Path -Recurse -Force
    }
}

Write-Host "Generated Unreal directories cleaned."
