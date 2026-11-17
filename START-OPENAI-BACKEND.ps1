$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$bundledJdk = Join-Path (Split-Path $PSScriptRoot -Parent) '.tools\jdk21\jdk-21.0.13+9'
if (Test-Path (Join-Path $bundledJdk 'bin\java.exe')) {
    $env:JAVA_HOME = $bundledJdk
    $env:Path = "$bundledJdk\bin;$env:Path"
}
$env:MERIDIAN_AI_PROVIDER = 'openai'
$env:MERIDIAN_AI_MODEL = 'gpt-4.1-mini'
$env:MERIDIAN_AI_ENDPOINT = 'https://api.openai.com/v1/responses'
$enteredKey = $false
if (-not $env:OPENAI_API_KEY) {
    $secureKey = Read-Host 'Enter your OpenAI API key (hidden; not saved to disk)' -AsSecureString
    $env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new('', $secureKey).Password
    $enteredKey = $true
}
if (-not $env:OPENAI_API_KEY) { throw 'An OpenAI API key is required.' }
try {
    . (Join-Path $PSScriptRoot 'scripts\Normalize-AiKey.ps1')
    $env:OPENAI_API_KEY = ConvertTo-MeridianApiKey $env:OPENAI_API_KEY
    & (Join-Path $PSScriptRoot 'CHECK-AI-CONNECTION.ps1') -UseExistingKey
    $pendingJar = Join-Path $PSScriptRoot 'hospital-management-system-ai-update.jar'
    if (Test-Path -LiteralPath $pendingJar) {
        Copy-Item -LiteralPath $pendingJar -Destination (Join-Path $PSScriptRoot 'hospital-management-system-ai.jar') -Force
    }
    Write-Host 'Starting Meridian backend with OpenAI. Keep this terminal open. Stop with Ctrl+C.'
    & java -jar (Join-Path $PSScriptRoot 'hospital-management-system-ai.jar')
} finally {
    if ($enteredKey) { Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue }
}
