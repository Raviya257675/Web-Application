$ErrorActionPreference = 'Stop'
$projectDir = $PSScriptRoot
$bundledJdk = Join-Path (Split-Path $projectDir -Parent) '.tools\jdk21\jdk-21.0.13+9'
if (Test-Path (Join-Path $bundledJdk 'bin\java.exe')) { $env:JAVA_HOME = $bundledJdk }
function Invoke-Check($folder, $command, $arguments) {
    Push-Location (Join-Path $projectDir $folder)
    try {
        & $command @arguments
        if ($LASTEXITCODE -ne 0) { throw "$folder check failed: $command $arguments" }
    } finally { Pop-Location }
}
Invoke-Check 'frontend' 'npm.cmd' @('run','build')
Invoke-Check 'backend' '.\mvnw.cmd' @('verify')
Invoke-Check 'gateway' 'npm.cmd' @('test')
Invoke-Check 'frontend' 'npm.cmd' @('audit')
Invoke-Check 'gateway' 'npm.cmd' @('audit')
Write-Host 'PRECOMMIT_CHECKS_PASSED: builds, automated tests and npm audits passed.' -ForegroundColor Green
Write-Host 'See docs/PRECOMMIT_REVIEW.md for browser checks and coverage limits.'
