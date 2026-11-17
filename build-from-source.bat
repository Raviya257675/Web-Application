@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Building Meridian HMS from source
echo   Requires: JDK 21+ and Node.js 20+ (Maven comes via wrapper)
echo ============================================================

where java >nul 2>nul || (echo Java not found & pause & exit /b 1)
where npm  >nul 2>nul || (echo Node.js/npm not found & pause & exit /b 1)

echo.
echo [1/3] Building the React frontend...
pushd frontend
if not exist node_modules (
  call npm install --no-audit --no-fund || (popd & pause & exit /b 1)
)
call npm run build || (popd & pause & exit /b 1)
popd

echo.
echo [2/3] Building the Spring Boot jar (Maven wrapper)...
pushd backend
call mvnw.cmd -B clean package -DskipTests || (popd & pause & exit /b 1)
copy /Y target\hospital-management-system.jar ..\hospital-management-system.jar >nul
copy /Y target\hospital-management-system.jar ..\hospital-management-system-local-ai.jar >nul
popd

echo.
echo [3/3] Done.
echo The jar is at hospital-management-system.jar — run RUN-WINDOWS.bat.
pause
