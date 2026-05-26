@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ==============================================
:: 餐廳 POS 本機安裝腳本 (Windows)
:: 使用方式：直接雙擊 setup-local.bat
:: ==============================================

echo ========================================
echo   餐廳 POS 系統 - 本機安裝 (Windows)
echo ========================================
echo.

cd /d "%~dp0"

:: ---- 檢查 Node.js ----
where node >nul 2>&1
if %errorlevel% equ 0 (
  for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
  echo ✅ Node.js !NODE_VERSION! 已安裝
  goto :install_deps
)

echo.
echo 📦 正在下載 Node.js 可攜版...
set NODE_URL=https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip
set NODE_ZIP=%TEMP%\node-portable.zip
set NODE_DIR=%USERPROFILE%\.local\node-portable

if not exist "%NODE_DIR%" (
  mkdir "%USERPROFILE%\.local" 2>nul
  powershell -Command "Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_ZIP%'"
  powershell -Command "Expand-Archive -Path '%NODE_ZIP%' -DestinationPath '%USERPROFILE%\.local'"
  del "%NODE_ZIP%" 2>nul
)

set PATH=%USERPROFILE%\.local\node-v22.14.0-win-x64;%PATH%
echo ✅ Node.js 安裝完成

:install_deps
echo.
echo 📦 正在安裝專案依賴...
call npm install --silent
echo ✅ 依賴安裝完成

echo.
echo ========================================
echo   安裝完成！
echo ========================================
echo.
echo   啟動伺服器請雙擊 start-local.bat
echo.
pause
