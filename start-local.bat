@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ==============================================
:: 餐廳 POS 本機啟動腳本 (Windows)
:: 使用方式：直接雙擊 start-local.bat
:: ==============================================

cd /d "%~dp0"

:: ---- 找出 Node.js ----
set NODE_CMD=
where node >nul 2>&1
if %errorlevel% equ 0 (
  set NODE_CMD=node
) else if exist "%USERPROFILE%\.local\node-v22.14.0-win-x64\node.exe" (
  set PATH=%USERPROFILE%\.local\node-v22.14.0-win-x64;%PATH%
  set NODE_CMD=node
) else (
  echo ❌ 找不到 Node.js，請先執行 setup-local.bat
  pause
  exit /b 1
)

:: ---- 檢查依賴 ----
if not exist "node_modules" (
  echo 📦 正在安裝依賴...
  call npm install --silent
)

:: ---- 取得本機 IP ----
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set LOCAL_IP=%%a
  set LOCAL_IP=!LOCAL_IP: =!
  goto :found_ip
)
:found_ip

if "%LOCAL_IP%"=="" set LOCAL_IP=localhost

echo.
echo ========================================
echo   餐廳 POS 系統 - 本機啟動
echo ========================================
echo.
echo   本機頁面：http://localhost:3000
echo   區網頁面：http://%LOCAL_IP%:3000
echo   客戶點餐：http://%LOCAL_IP%:3000/order.html?t=admin
echo.
echo   按 Ctrl+C 停止伺服器
echo ========================================
echo.

:: 自動打開瀏覽器
start http://localhost:3000/login.html

%NODE_CMD% server.js
pause
