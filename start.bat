@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo NPM nao encontrado. Instale o Node.js em https://nodejs.org e tente novamente.
  pause
  exit /b 1
)

if not exist node_modules\node-pty (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

call npm start
