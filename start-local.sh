#!/bin/bash
# ==============================================
# 餐廳 POS 本機啟動腳本 (Linux / Mac)
# 使用方式：bash start-local.sh
# ==============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ---- 找出 Node.js ----
if command -v node &>/dev/null; then
  NODE_BIN="node"
elif [ -d "$HOME/.local/node-v22.14.0-linux-x64/bin" ]; then
  export PATH="$HOME/.local/node-v22.14.0-linux-x64/bin:$PATH"
  NODE_BIN="node"
else
  echo "❌ 找不到 Node.js，請先執行 bash setup-local.sh"
  exit 1
fi

# ---- 檢查依賴 ----
if [ ! -d "node_modules" ]; then
  echo "📦 正在安裝依賴..."
  npm install --silent
fi

# ---- 取得本機 IP ----
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")
fi

# ---- 啟動伺服器 ----
PORT=${PORT:-3000}
echo ""
echo "========================================"
echo "  餐廳 POS 系統 - 本機啟動"
echo "========================================"
echo ""
echo "  本機頁面：http://localhost:$PORT"
echo "  區網頁面：http://$LOCAL_IP:$PORT"
echo "  客戶點餐：http://$LOCAL_IP:$PORT/order.html?t=admin"
echo ""
echo "  按 Ctrl+C 停止伺服器"
echo "========================================"
echo ""

# 自動打開瀏覽器
if command -v xdg-open &>/dev/null; then
  sleep 2 && xdg-open "http://localhost:$PORT/login.html" &
elif command -v open &>/dev/null; then
  sleep 2 && open "http://localhost:$PORT/login.html" &
fi

exec $NODE_BIN server.js
