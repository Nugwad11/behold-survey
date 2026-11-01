@echo off
title Covenant Survey Server
cd /d "%~dp0"
if "%ADMIN_PASSWORD%"=="" (
  echo.
  echo  No ADMIN_PASSWORD set - the dashboard will use the default password.
  echo  Set one for real use:  set ADMIN_PASSWORD=your-strong-password
  echo.
)
node server.js
echo.
echo Server stopped. Press any key to close this window.
pause >nul
