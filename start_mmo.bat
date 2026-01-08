@echo off
setlocal EnableDelayedExpansion
title Cliffwald 2D - Master Controller

:MAIN_MENU
cls
echo ========================================================
echo               CLIFFWALD 2D - CONTROL CENTER
echo ========================================================

REM --- DETECT CURRENT MODE ---
set "CURRENT_MODE=UNKNOWN"
findstr /C:"provider = \"postgresql\"" "prisma\schema.prisma" >nul
if !errorlevel! equ 0 (
    set "CURRENT_MODE=CLOUD (Supabase/PostgreSQL)"
    set "MODE_COLOR=36" REM Cyan
) else (
    set "CURRENT_MODE=LOCAL (SQLite)"
    set "MODE_COLOR=32" REM Green
)

REM --- DISPLAY STATUS ---
echo.
echo   CURRENT ENVIRONMENT: [!MODE_COLOR!m!CURRENT_MODE![0m
echo.
echo ========================================================
echo   ACTIONS:
echo.
echo   1. [START]  Launch MMO (Server + Client + Logs)
echo   2. [TOOLS]  Open Tiled Map Editor
echo   3. [SWITCH] Switch to LOCAL (SQLite)
echo   4. [SWITCH] Switch to CLOUD (Supabase)
echo   5. [CLEAN]  Kill All Node/Java Processes
echo   6. [EXIT]   Close Controller
echo.
echo ========================================================

choice /c 123456 /n /m "Select Option [1-6]: "

if errorlevel 6 goto EXIT
if errorlevel 5 goto KILL
if errorlevel 4 goto SET_CLOUD
if errorlevel 3 goto SET_LOCAL
if errorlevel 2 goto TILED
if errorlevel 1 goto START_MMO

:SET_LOCAL
powershell -File tools/switch_env.ps1 -mode local
pause
goto MAIN_MENU

:SET_CLOUD
powershell -File tools/switch_env.ps1 -mode cloud
pause
goto MAIN_MENU

:START_MMO
echo.
echo [1/2] Cleaning ports...
call tools\kill_all.bat >nul 2>&1
echo [2/2] Launching !CURRENT_MODE!...
npm run dev
pause
goto MAIN_MENU

:TILED
start "" "Tiled\tiled.exe" "assets\maps\world.json"
goto MAIN_MENU

:KILL
call tools\kill_all.bat
echo All processes killed.
timeout /t 2 >nul
goto MAIN_MENU

:EXIT
exit