@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ===============================================
echo Meridian HMS - React / Express / Spring Boot
echo ===============================================

where.exe java >nul 2>nul
if errorlevel 1 (
  echo ERROR: Java 21 or newer is required.
  pause
  exit /b 1
)
where.exe node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js 20 or newer is required.
  pause
  exit /b 1
)
where.exe npm.cmd >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is required.
  pause
  exit /b 1
)
if not exist "hospital-management-system.jar" (
  echo ERROR: hospital-management-system.jar is missing in this folder.
  pause
  exit /b 1
)

if not exist "gateway\node_modules\express" (
  echo Installing gateway dependencies. Internet is required on the first run.
  pushd "gateway"
  call npm.cmd install --no-audit --no-fund
  if errorlevel 1 (
    echo ERROR: Unable to install gateway dependencies.
    popd
    pause
    exit /b 1
  )
  popd
)

echo Starting Spring Boot on port 8080 in a separate window...
start "Meridian Spring Boot - 8080" /D "%~dp0" cmd.exe /k "java -jar hospital-management-system.jar"

echo.
echo Starting Express on port 5000...
echo After Express reports it is ready, open http://localhost:5000
echo.
pushd "gateway"
call npm.cmd start
popd

echo.
echo Express has stopped. Close the Spring Boot window to stop Java.
pause
