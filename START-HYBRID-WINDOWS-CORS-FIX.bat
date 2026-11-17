@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ================================================
echo MERIDIAN HMS - START HYBRID WITH CORS FIX
echo React - Express Gateway - Spring Boot
echo ================================================
echo.

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
    echo ERROR: hospital-management-system.jar not found.
    echo Place this batch file in the Meridian-HMS-SpringBoot project folder.
    pause
    exit /b 1
)
if not exist "gateway\package.json" (
    echo ERROR: Missing gateway folder.
    pause
    exit /b 1
)
if not exist "gateway\node_modules\express" (
    echo Installing Express gateway dependencies...
    pushd "gateway"
    call npm.cmd install --no-audit --no-fund
    if errorlevel 1 (
        echo ERROR: Gateway dependency installation failed.
        popd
        pause
        exit /b 1
    )
    popd
)

echo.
echo IMPORTANT: Close any old Spring Boot or Gateway windows before running.
echo Starting Spring Boot on port 8080 with localhost 5000 permitted in CORS...
start "Meridian Spring Boot - 8080" /D "%~dp0" cmd.exe /k "java -jar hospital-management-system.jar --app.cors.allowed-origins=http://localhost:5000,http://127.0.0.1:5000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173"

echo Starting Express gateway on port 5000...
echo When both servers are ready, open http://localhost:5000
pushd "gateway"
call npm.cmd start
popd

echo.
echo Express gateway has stopped. Close the Spring Boot window to stop Java.
pause
