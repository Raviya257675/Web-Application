$ErrorActionPreference = 'Stop'
try {
    $models = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5
    if (-not ($models.models | Where-Object name -EQ 'qwen3:1.7b')) { throw 'Local model is missing. Run START-LOCAL-AI.ps1.' }
    $status = Invoke-RestMethod 'http://localhost:8080/api/public/assistant/status' -TimeoutSec 5
    if ($status.data.provider -ne 'ollama') { throw 'An older backend is running on 8080. Stop it and run START-LOCAL-AI.ps1.' }
    $body = @{ messages = @(@{ role = 'user'; content = 'How do I book a visit in Meridian? Give short steps.' }) } | ConvertTo-Json -Depth 5
    Write-Host 'Checking a real local AI reply. First load can take up to two minutes...'
    $reply = Invoke-RestMethod 'http://localhost:8080/api/public/assistant/chat' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 135
    if ([string]::IsNullOrWhiteSpace($reply.data.reply)) { throw 'The backend returned an empty reply.' }
    Write-Host 'LOCAL_AI_OK: Model and backend replied successfully. No API payment is used.' -ForegroundColor Green
    Write-Output $reply.data.reply
} catch {
    Write-Host ('LOCAL_AI_CHECK_FAILED: ' + $_.Exception.Message) -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Output $_.ErrorDetails.Message }
    exit 1
}
