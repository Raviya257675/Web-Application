# Use the same Java HTTPS implementation as the backend. Never print credentials.
param([switch]$UseExistingKey)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts\Normalize-AiKey.ps1')
$diagnosticKey = $env:OPENAI_API_KEY
if (-not $UseExistingKey -or -not $diagnosticKey) {
    $secret = Read-Host 'Paste your OpenAI API key (hidden)' -AsSecureString
    $diagnosticKey = [Net.NetworkCredential]::new('', $secret).Password
}
$bundledJava = Join-Path (Split-Path $PSScriptRoot -Parent) '.tools\jdk21\jdk-21.0.13+9\bin\java.exe'
$javaCommand = if (Test-Path -LiteralPath $bundledJava) { $bundledJava } else { 'java' }
$previousDiagnosticKey = $env:MERIDIAN_DIAGNOSTIC_KEY
try {
    try { $env:MERIDIAN_DIAGNOSTIC_KEY = ConvertTo-MeridianApiKey $diagnosticKey }
    catch { Write-Host $_.Exception.Message -ForegroundColor Yellow; return }
    Write-Host 'Testing OpenAI with the backend Java runtime (one small API request)...'
    & $javaCommand (Join-Path $PSScriptRoot 'scripts\CheckAiConnection.java')
} finally {
    if ($null -eq $previousDiagnosticKey) { Remove-Item Env:MERIDIAN_DIAGNOSTIC_KEY -ErrorAction SilentlyContinue }
    else { $env:MERIDIAN_DIAGNOSTIC_KEY = $previousDiagnosticKey }
    $diagnosticKey = $null
    $secret = $null
}
