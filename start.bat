@echo off
cd /d "%~dp0"
echo Starting SmartRent Backend Server...
echo.
node src/server.js
pause
