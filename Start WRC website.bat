@echo off
rem  Double-click to open the Wealth Rebuild Circle website on this computer.
rem
rem  It serves the finished (production) build, not the developer server, so a
rem  closed VS Code terminal or an edited file cannot break a demo halfway
rem  through. It rebuilds only when something in the app has changed since the
rem  last build, then opens http://localhost:4173 in the default browser.

title WRC website - keep this window open
cd /d "%~dp0"

echo.
echo   Wealth Rebuild Circle - website on this computer
echo   ------------------------------------------------

rem  Already running? Just open it again.
netstat -ano | findstr /r /c:":4173 .*LISTENING" >nul
if not errorlevel 1 (
  echo   The website is already running. Opening it...
  start "" http://localhost:4173/
  timeout /t 3 >nul
  exit /b 0
)

if not exist "node_modules\" (
  echo   Installing the app's packages - first time only, a few minutes...
  call npm.cmd install || goto failed
)

rem  Rebuild when there is no build yet, or anything in the app is newer than it.
powershell -NoProfile -Command "$b = Get-Item 'dist\index.html' -ErrorAction SilentlyContinue; if (-not $b) { exit 1 }; $n = Get-ChildItem 'src','public' -Recurse -File | Where-Object { $_.LastWriteTime -gt $b.LastWriteTime } | Select-Object -First 1; if ($n -or (Get-Item 'index.html','vite.config.ts','package.json' | Where-Object { $_.LastWriteTime -gt $b.LastWriteTime })) { exit 1 } else { exit 0 }"
if errorlevel 1 (
  echo   Building the latest version - about a minute...
  call npm.cmd run build || goto failed
)

echo.
echo   Opening http://localhost:4173 in your browser.
echo   Keep this window open while you use the website. Close it to stop.
echo.
call npx.cmd vite preview --port 4173 --strictPort --open
goto :eof

:failed
echo.
echo   Something went wrong - the message above says what.
pause
