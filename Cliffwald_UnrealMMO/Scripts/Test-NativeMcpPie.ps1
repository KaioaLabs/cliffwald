param(
    [string]$Endpoint = "http://127.0.0.1:8000/mcp"
)

$ErrorActionPreference = "Stop"

$Python = Get-Command python -ErrorAction SilentlyContinue
if ($null -eq $Python) {
    throw "python was not found on PATH."
}

& $Python.Source (Join-Path $PSScriptRoot "TestNativeMcpPie.py") --endpoint $Endpoint
exit $LASTEXITCODE
