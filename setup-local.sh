#!/bin/bash
# ==============================================
# 餐廳 POS 本機安裝腳本 (Linux / Mac)
# 使用方式：bash setup-local.sh
# ==============================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  餐廳 POS 系統 - 本機安裝"
echo "========================================"
echo ""

# ---- 檢查 Node.js ----
if command -v node &>/dev/null; then
  echo "✅ Node.js $(node --version) 已安裝"
else
  echo "📦 正在下載 Node.js (免 sudo)..."
  NODE_VER="v22.14.0"
  NODE_URL="https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-linux-x64.tar.xz"
  NODE_DIR="$HOME/.local/node-${NODE_VER}-linux-x64"

  if [ ! -d "$NODE_DIR" ]; then
    mkdir -p "$HOME/.local"
    curl -sL "$NODE_URL" -o /tmp/node.tar.xz
    tar -xJf /tmp/node.tar.xz -C "$HOME/.local"
    rm /tmp/node.tar.xz
  fi
  export PATH="$NODE_DIR/bin:$PATH"
  echo "✅ Node.js $(node --version) 安裝完成"
fi

# ---- 安裝依賴 ----
echo ""
echo "📦 正在安裝專案依賴..."
npm install --silent
echo "✅ 依賴安裝完成"

# ---- 完成 ----
echo ""
echo "========================================"
echo "  安裝完成！"
echo "========================================"
echo ""
echo "  啟動伺服器請執行："
echo "    bash start-local.sh"
echo ""
echo "  或直接執行："
echo "    node server.js"
echo ""
