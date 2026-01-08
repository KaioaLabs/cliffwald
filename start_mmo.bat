@echo off
setlocal EnableDelayedExpansion
title Cliffwald 2D - Master Controller

:MAIN_MENU
cls
echo ========================================================
echo               CLIFFWALD 2D - CONTROL CENTER
echo ========================================================
echo.

  ARCHITECTURE: UNIFIED POSTGRESQL (Supabase)
  STATUS:       READY


========================================================
  ACTIONS:

  1. [START]  Launch MMO (Server + Client + Logs)
  2. [TOOLS]  Open Tiled Map Editor
  3. [CLEAN]  Kill All Node/Java Processes
  4. [EXIT]   Close Controller


========================================================

choice /c 1234 /n /m "Select Option [1-4]: "

if errorlevel 4 goto EXIT
if errorlevel 3 goto KILL
if errorlevel 2 goto TILED
if errorlevel 1 goto START_MMO

:START_MMO
echo.

[1/2] Cleaning ports...
call tools\kill_all.bat >nul 2>&1
echo [2/2] Launching Environment...
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
