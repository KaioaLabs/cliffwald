@echo off
setlocal EnableDelayedExpansion
title Cliffwald 2D - Master Controller

:: --- AUTO-CLEAN ON STARTUP ---
echo [SYSTEM] Performing startup cleanup...
powershell -ExecutionPolicy Bypass -File "tools\kill_all.ps1"
echo.

:MAIN_MENU
cls
echo ========================================================
echo               CLIFFWALD 2D - CONTROL CENTER
echo ========================================================
echo.
echo   ACTIONS:
echo.
echo   1. [DEV]    Launch Development Mode (Server + Client)
echo   2. [MAP]    Open Tiled Map Editor
echo   3. [WIPE]   Factory Reset Database
echo   4. [EXIT]   Close Controller
echo.
echo ========================================================
echo.

choice /c 1234 /n /t 5 /d 1 /m "Select Option [1-4] (Auto-Start in 5s): "

if errorlevel 4 goto EXIT
if errorlevel 3 goto WIPE_DB
if errorlevel 2 goto TILED
if errorlevel 1 goto START_DEV

:START_DEV
echo.
echo [INFO] Environment is clean. Launching...
call npm run dev:win
if %errorlevel% neq 0 (
    echo [ERROR] npm run dev failed with error code %errorlevel%.
    echo Check logs above for details.
    pause
)
goto MAIN_MENU

:WIPE_DB
cls
echo ========================================================
echo               FACTORY RESET DATABASE
echo ========================================================
echo.
echo   WARNING: THIS WILL DELETE ALL USERS, ITEMS, AND PROGRESS.
echo   THIS ACTION CANNOT BE UNDONE.
echo.
choice /c YN /n /m "Are you sure? [Y/N]: "
if errorlevel 2 goto MAIN_MENU

echo.
echo [1/2] Deleting database file...
if exist "prisma\dev.db" (
    del /f /q "prisma\dev.db"
    echo [OK] Deleted existing database.
) else (
    echo [INFO] No database found (already clean).
)

echo [2/2] Re-creating schema...
call npx prisma db push

echo.
echo [SUCCESS] Database has been reset to factory state.
echo           Admin account will be auto-seeded on next start.
pause
goto MAIN_MENU

:TILED
start "" "vendor\Tiled\tiled.exe" "assets\maps\world.json"
goto MAIN_MENU

:EXIT
exit
