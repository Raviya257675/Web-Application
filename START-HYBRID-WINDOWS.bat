@echo off
setlocal
cd /d "%~dp0"
where java >nul 2>nul
if errorlevel 1 (echo Java 21+ is required.& pause & exit /b 1)
where node >nul 2>nul
if errorlevel 1 (echo Node.js 20+ is required.& pause & exit /b 1)
where npm >nul 2>nul
if errorlevel 1 (echo npm is required.& pause & exit /b 1)
if not exist "gateway\node_modules\express" (
  echo Installing Express gateway dependencies (Internet required on first run)...
  pushd gateway
  call npm install --no-audit --no-fund
  if errorlevel 1 (popd & pause & exit /b 1)
  popd
)
echo Starting Spring Boot in another command window (port 8080)...
start "Meridian Spring Boot - 8080" /D "%~dp0" cmd /k java -jar hospital-management-system.jar
echo.
echo Browse http://localhost:5000 for the full hybrid application.
echo The support module is at http://localhost:5000/support
echo.
start "" http://localhost:5000
pushd gateway
call npm start
popd
echo The Express gateway has stopped. Close the Spring Boot window to stop Java too.
pause
