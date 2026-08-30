#!/usr/bin/env bash
# Inicia o maestri-like e abre no navegador
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

PORT="${PORT:-7845}"

# verifica dependencias
if [ ! -d node_modules ] || [ ! -d node_modules/node-pty ]; then
  echo "Instalando dependências…"
  npm install
fi

if ! lsof -i :"$PORT" >/dev/null 2>&1; then
  node server/index.js > /tmp/maestri-like.log 2>&1 &
  echo "Servidor iniciado em segundo plano (log: /tmp/maestri-like.log)"
else
  echo "Porta $PORT já em uso — usando servidor existente."
fi

sleep 1
URL="http://localhost:$PORT/"
echo "Abrindo $URL"
if command -v open >/dev/null 2>&1; then
  open "$URL"
else
  echo "Abra $URL no navegador"
fi
