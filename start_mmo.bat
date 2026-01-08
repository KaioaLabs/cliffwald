@echo off
title Cliffwald 2D - Master Controller

:: [AUTOMATIC CLEANUP]
echo Initializing System...
call tools\kill_all.bat
timeout /t 1 /nobreak >nul

:MODE_SELECT
cls
echo ==========================================
echo   CLIFFWALD 2D - ENVIRONMENT SELECTOR
echo ==========================================
echo.
echo  1. CLOUD MODE (Supabase + Render DB) [PERSISTENT]
echo  2. LOCAL MODE (SQLite) [FAST/OFFLINE]
echo.

echo  Current Mode: Check .env content manually if unsure.
echo.

choice /c 12 /n /m "Select Environment (1=Cloud, 2=Local):"

if errorlevel 2 goto SET_LOCAL
if errorlevel 1 goto SET_CLOUD

:SET_CLOUD
powershell -File tools/switch_env.ps1 -mode cloud
goto MENU

:SET_LOCAL
powershell -File tools/switch_env.ps1 -mode local
goto MENU

:MENU
cls
echo ==========================================
echo   CLIFFWALD 2D - MASTER CONTROLLER
echo ==========================================
echo.

echo  1. Start EVERYTHING (MMO + Tiled) [DEFAULT]
echo  2. Open Map Editor (Tiled)
echo  3. Start MMO Only (Server + Client)
echo  4. Exit
echo.

:: Auto-select Option 1 in 5 seconds
choice /c 1234 /n /t 5 /d 1 /m "Select option (1-4) or wait for default:"

if errorlevel 4 exit
if errorlevel 3 goto START_MMO
if errorlevel 2 goto START_TILED
if errorlevel 1 goto START_ALL

goto MENU

:START_ALL
echo.

echo [1/3] Deep Cleaning...
call tools\kill_all.bat
timeout /t 1 /nobreak >nul

echo [2/3] Launching Tiled...
start "" "Tiled\tiled.exe" "assets\maps\world.json"

echo [3/3] Starting Development Environment...

npm run dev
pause
goto MENU

:START_MMO
echo.

echo [1/2] Cleaning previous sessions...
call tools\kill_all.bat
timeout /t 1 /nobreak >nul

echo [2/2] Starting Development Environment...

npm run dev
pause
goto MENU

:START_TILED
echo Starting Tiled...
start "" "Tiled\tiled.exe" "assets\maps\world.json"
goto MENU
