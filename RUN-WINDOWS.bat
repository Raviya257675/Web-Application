@echo off
setlocal
cd /d "%~dp0"

where java >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Java was not found on this computer.
  echo   Install JDK 21 or newer from https://adoptium.net and try again.
  echo.
  pause
  exit /b 1
)

echo.
echo   Starting Meridian HMS...
echo   The hospital will open at http://localhost:8080 in a few seconds.
echo   Keep this window open. Press Ctrl+C to stop the server.
echo.

start "" cmd /c "timeout /t 12 >nul & start http://localhost:8080"
java -jar hospital-management-system.jar

echo.
echo   The server has stopped.
pause
