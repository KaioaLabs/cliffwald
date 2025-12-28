@echo off
title Cliffwald 2D Launcher

echo ===================================================
echo   Cliffwald 2D - MMO Environment Launcher
echo ===================================================
echo.

echo [0/3] Cleaning up ports 2567 and 3000...
:: Find PID listening on 2567 (Server) and kill it
FOR /F "tokens=5" %%a IN ('netstat -aon ^| find ":2567" ^| find "LISTENING"') DO taskkill /f /pid %%a >nul 2>&1

:: Find PID listening on 3000 (Client) and kill it
FOR /F "tokens=5" %%a IN ('netstat -aon ^| find ":3000" ^| find "LISTENING"') DO taskkill /f /pid %%a >nul 2>&1

echo [1/3] Starting Game Server (Colyseus + Rapier)...
:: /k keeps the window open so you can see logs
start "Cliffwald Server" cmd /k "npm run dev:server"

echo [2/3] Starting Client Host (Vite)...
start "Cliffwald Client Host" cmd /k "npm run dev:client"

echo Waiting 8 seconds for services to boot...
timeout /t 8 /nobreak >nul

echo [3/3] Launching 2 Client Instances...
:: Open default browser
start http://localhost:3000
timeout /t 1 /nobreak >nul
start http://localhost:3000

echo.
echo ===================================================
echo   System Running!
echo   - Server Port: 2567
echo   - Client Port: 3000
echo   - To restart: Close windows and run this bat again.
echo ===================================================
pause