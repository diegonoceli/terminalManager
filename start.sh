#!/usr/bin/env bash
# Launcher do terminal manager (macOS/Linux)
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if [ ! -d node_modules ] || [ ! -d node_modules/node-pty ]; then
  echo "Instalando dependências…"
  npm install
fi

exec npm start
