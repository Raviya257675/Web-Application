$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host 'Hospital administrator setup. Stop the running backend before continuing.'
Write-Host 'Use a new email, or the same email/password as a pending Administrator application.'
$env:APP_ADMIN_EMAIL = Read-Host 'Administrator email'
$adminSecret = Read-Host 'Administrator password (at least 12 characters)' -AsSecureString
$env:APP_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $adminSecret).Password
try {
    & java -jar hospital-management-system.jar
} finally {
    Remove-Item Env:APP_ADMIN_EMAIL, Env:APP_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    $adminSecret.Dispose()
}
