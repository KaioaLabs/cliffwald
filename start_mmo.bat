@echo off
setlocal EnableDelayedExpansion
title Cliffwald 2D - Master Controller

:MAIN_MENU
cls
echo ========================================================
echo               CLIFFWALD 2D - CONTROL CENTER
echo ========================================================
echo.
echo   ARCHITECTURE: UNIFIED POSTGRESQL (Supabase)
echo   STATUS:       READY
echo.
echo ========================================================
echo   ACTIONS:
echo.
echo   1. [START]  Launch MMO (Server + Client + Logs)
echo   2. [TOOLS]  Open Tiled Map Editor
echo   3. [CLEAN]  Kill All Node/Java Processes
echo   4. [WIPE]   Factory Reset DB (Delete All Data)
echo   5. [EXIT]   Close Controller
echo.
echo ========================================================
echo.

choice /c 12345 /n /m "Select Option [1-5]: "

if errorlevel 5 goto EXIT
if errorlevel 4 goto WIPE_DB
if errorlevel 3 goto KILL
if errorlevel 2 goto TILED
if errorlevel 1 goto START_MMO

:START_MMO
echo.

echo [1/2] Cleaning ports...
call tools\kill_all.bat
echo [2/2] Launching Environment...
call npm run dev
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

:KILL
call tools\kill_all.bat
echo All processes killed.
timeout /t 2 >nul
goto MAIN_MENU

:EXIT
exit
