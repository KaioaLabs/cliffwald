@echo off
echo [KAIOA] Building Engine Core...
node build_kaioa.js

echo [KAIOA] Deploying to Tiled Extensions...
set TARGET_DIR=%LOCALAPPDATA%\Tiled\extensions

if not exist "%TARGET_DIR%" (
    echo [ERROR] Tiled extension folder not found at: %TARGET_DIR%
    echo Please create it manually or check your Tiled installation.
    pause
    exit /b
)

copy /Y "tiled_extensions\kaioa_engine_bundled.js" "%TARGET_DIR%\kaioa_engine_bundled.js"

echo [KAIOA] Cleaning up old versions...
if exist "%TARGET_DIR%\cliffwald_engine_view.js" del "%TARGET_DIR%\cliffwald_engine_view.js"
if exist "%TARGET_DIR%\cliffwald_lighting.js" del "%TARGET_DIR%\cliffwald_lighting.js"
if exist "%TARGET_DIR%\kaioa_engine_view.js" del "%TARGET_DIR%\kaioa_engine_view.js"

echo [SUCCESS] KaioaEngine updated! Restart Tiled (or press Ctrl+T / F5 in Tiled) to see changes.
pause