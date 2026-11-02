@echo off
rem NiceAgent Web - one-click dev launcher.
rem Starts the API server (:7368) and the Web App (:7365) with `pnpm dev`,
rem then opens the default browser once http://localhost:7365/ answers.
setlocal
cd /d "%~dp0"
title NiceAgent - Web

where node >nul 2>nul
if errorlevel 1 (
  echo [NiceAgent] Node.js not found. Install Node 24 or newer, then retry.
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo [NiceAgent] pnpm not found. Run "corepack enable" once, then retry.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [NiceAgent] Dependencies are not installed yet. Run "pnpm install" once, then retry.
  pause
  exit /b 1
)

rem Already running? Just bring the page up and leave the running instance alone.
node "%~dp0scripts\dev-web-open.mjs" --check
if not errorlevel 1 (
  echo [NiceAgent] Already running at http://localhost:7365/ - opening browser.
  start "" "http://localhost:7365/"
  exit /b 0
)

rem Opens the browser in the background as soon as the dev server is ready.
start "" /b node "%~dp0scripts\dev-web-open.mjs"

echo [NiceAgent] Starting API server (:7368) and Web App (:7365)...
echo [NiceAgent] Keep this window open; press Ctrl+C or close it to stop.
echo.
call pnpm dev

echo.
echo [NiceAgent] Dev servers stopped.
pause
