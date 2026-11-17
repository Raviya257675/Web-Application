param([switch]$OllamaOnly)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$toolsDir = Join-Path (Split-Path $PSScriptRoot -Parent) '.tools'
$ollama = Join-Path $toolsDir 'ollama\ollama.exe'
if (-not (Test-Path -LiteralPath $ollama)) { throw 'Local Ollama runtime is missing. Restore the .tools\ollama folder supplied with this project.' }
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_MODELS = Join-Path $toolsDir 'ollama-models'
$env:OLLAMA_VULKAN = '1'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_LOADED_MODELS = '1'
$env:MERIDIAN_AI_PROVIDER = 'ollama'
$env:MERIDIAN_AI_MODEL = 'qwen3:1.7b'
$env:MERIDIAN_AI_ENDPOINT = 'http://127.0.0.1:11434/api/chat'
Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
$ready = $false
try { $null = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 3; $ready = $true } catch { }
if (-not $ready) {
    New-Item -ItemType Directory -Force (Join-Path $toolsDir 'ollama-logs') | Out-Null
    Start-Process -FilePath $ollama -ArgumentList 'serve' -WindowStyle Hidden -WorkingDirectory $PSScriptRoot -RedirectStandardOutput (Join-Path $toolsDir 'ollama-logs\server-out.log') -RedirectStandardError (Join-Path $toolsDir 'ollama-logs\server-error.log') | Out-Null
    for ($attempt=0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Seconds 1
        try { $null = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2; $ready=$true; break } catch { }
    }
}
if (-not $ready) { throw 'Local AI did not start. Check .tools\ollama-logs\server-error.log.' }
$models = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5
if (-not ($models.models | Where-Object name -EQ $env:MERIDIAN_AI_MODEL)) {
    $modelFile = Join-Path $toolsDir 'Qwen3-1.7B-Q8_0.gguf'
    if (-not (Test-Path -LiteralPath $modelFile)) {
        throw 'The model is missing. Restore .tools\ollama-models, or follow docs\LOCAL_AI.md to download/import it again.'
    }
    Write-Host 'Verifying the local model download...'
    if ((Get-FileHash -LiteralPath $modelFile -Algorithm SHA256).Hash -ne '061b54daade076b5d3362dac252678d17da8c68f07560be70818cace6590cb1a') {
        throw 'Model download is incomplete or corrupted. Run python .tools\repair_model.py from the outer workspace folder before starting local AI.'
    }
    $modelDefinition = Join-Path $toolsDir 'Meridian.Modelfile'
    @("FROM `"$modelFile`"", 'PARAMETER num_ctx 8192', 'PARAMETER temperature 0.2') | Set-Content -LiteralPath $modelDefinition -Encoding UTF8
    & $ollama create $env:MERIDIAN_AI_MODEL -f $modelDefinition
    if ($LASTEXITCODE -ne 0) { throw 'Local model import failed. Check the downloaded model file.' }
}
Write-Host 'Local AI is ready. No API key or API payment is needed.' -ForegroundColor Green
if ($OllamaOnly) { return }
$bundledJdk = Join-Path $toolsDir 'jdk21\jdk-21.0.13+9'
$java = Join-Path $bundledJdk 'bin\java.exe'
if (-not (Test-Path -LiteralPath $java)) { $java = 'java' }
Write-Host 'Starting Meridian on port 8080. Stop an older backend first. Keep this terminal open.'
& $java -jar (Join-Path $PSScriptRoot 'hospital-management-system-local-ai.jar')
