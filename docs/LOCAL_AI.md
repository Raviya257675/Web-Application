# Local Meridian Assistant — no API fees

This setup uses the official Ollama v0.40.16 portable runtime (CPU/Vulkan) in `.tools/ollama` and the author's Qwen3 1.7B Q8_0 model, imported locally under the name `qwen3:1.7b` in `.tools/ollama-models`. The direct Hugging Face download is used because this connection could not reach the Ollama registry. No OpenAI API key or API credits are used. After downloading the model, inference runs on this PC without sending chat messages to an external AI provider. Internet is still needed for other external website assets such as maps, if used.

## Run

Stop an older backend using Ctrl+C, then:

```powershell
cd "C:\Users\MSI\Downloads\Meridian_HMS_Final_Polished_Project\Meridian-HMS-SpringBoot"
powershell -NoProfile -ExecutionPolicy Bypass -File .\START-LOCAL-AI.ps1
```

Keep the existing Vite frontend running at http://localhost:5173, refresh, and open Ask Meridian. The chat header says **Local AI · no API fees**. The script starts Ollama hidden on loopback port 11434 and runs `hospital-management-system-local-ai.jar` from the same project folder so the existing H2 database is retained. `START-AI-BACKEND.ps1` now launches this local setup too.

Use `START-LOCAL-AI.ps1 -OllamaOnly` to run only the local model service. Stop Ollama by ending the specific `.tools/ollama/ollama.exe serve` process when you no longer need it; this also frees model memory. The backend is stopped with Ctrl+C.

To check the complete connection, run `powershell -NoProfile -ExecutionPolicy Bypass -File .\CHECK-LOCAL-AI.ps1` in the project folder. It verifies the installed model, checks that port 8080 uses Ollama, and requests a real application-help reply. Success prints `LOCAL_AI_OK`. The older `CHECK-AI-CONNECTION.ps1` checks the paid OpenAI provider and is not used for this local setup. If the startup script reports a checksum mismatch after a restored download, run `python .tools/repair_model.py` from the outer workspace folder before retrying.

Verification on 2026-11-16: the complete model matches the author's SHA-256, all 13 assistant service/controller tests passed, and actual replies were received through both the backend and the browser chat. The existing file-backed database was retained. These checks verify operation, not the factual accuracy of every future model response.

## Limits

- First response can take longer while the model loads. Backend timeout is 120 seconds; only one local generation runs at a time.
- Replies are grounded in the application's guide, with the last four conversation messages retained for follow-ups. The bot cannot read records or perform transactions.
- Small local models can make mistakes, especially when interpreting Sinhala/Singlish. This local setup replies in simple English because its generated Singlish was unreliable in testing. English questions give the best results. Always verify important details in the actual application.
- The chosen model is compact for this PC's limited disk space and 4GB GPU. The runtime uses Vulkan when available and falls back to CPU if needed. No promise of cloud-model quality is made.
- CPU/GPU power, disk storage and initial internet download still use your own resources; there are no per-message API charges.

Official sources: https://docs.ollama.com/windows and https://ollama.com/library/qwen3:1.7b

To restore a missing model on this PC, run `python .tools/download_model.py` from the outer workspace folder (Python 3 required), then run `START-LOCAL-AI.ps1`. The resumable downloader fetches the official file from https://huggingface.co/Qwen/Qwen3-1.7B-GGUF and the startup script imports it into Ollama. Keep the `.tools` directory alongside the project when moving this application. The old paid-provider launcher is preserved as `START-OPENAI-BACKEND.ps1`; it is not used by local AI.
