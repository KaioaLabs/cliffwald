@echo off
title Cliffwald 2D - Vibe Coding Environment

echo [1/3] Cleaning up previous sessions...
call tools\kill_all.bat
timeout /t 2 /nobreak >nul

echo [2/3] Starting Development Environment...
echo [SERVER + CLIENT + LAUNCHER + REMOTE LOGS]
echo.
:: Usamos PowerShell para poder ver el log en pantalla y guardarlo en archivo a la vez
powershell -Command "npm run dev"
pause
