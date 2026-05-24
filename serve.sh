#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "5173 端口已有服务在运行。"
  echo "成长记录本地预览： http://localhost:5173/成长记录/"
  exit 0
fi

echo "成长记录本地预览： http://localhost:5173/成长记录/"
echo "按 Ctrl+C 停止服务"
python3 -m http.server 5173
