# Meridian Assistant

**Current setup: local AI without API fees.** Use [LOCAL_AI.md](LOCAL_AI.md) and `START-LOCAL-AI.ps1`. `START-AI-BACKEND.ps1` now launches local AI. The OpenAI instructions below are optional historical-provider instructions; use `START-OPENAI-BACKEND.ps1` only if deliberately returning to a paid API.

The bottom-right chat widget is mounted above routing, so it remains available on the homepage, sign-in/register screens and all five workspaces. Conversation stays in memory while navigating. New chat clears it; refreshing or changing accounts clears it too. It is not saved in browser storage or the hospital database.

## Start with real OpenAI replies

An OpenAI API key and an API account with available usage are required. A ChatGPT subscription alone is not the app's API credential. Never put the key in frontend code, VITE variables, source control or this chat.

1. Stop the existing backend terminal with Ctrl+C (only one backend can use port 8080).
2. Open PowerShell in the project directory and run:

```powershell
cd "C:\Users\MSI\Downloads\Meridian_HMS_Final_Polished_Project\Meridian-HMS-SpringBoot"
powershell -NoProfile -ExecutionPolicy Bypass -File .\START-AI-BACKEND.ps1
```

3. Paste your key into the hidden prompt. It is passed to the backend process, not saved to disk. Keep this terminal open.
4. Keep the frontend running with `npm.cmd run dev` in `frontend`. Open http://localhost:5173 and click **Ask Meridian**. Alternatively start the gateway with `npm.cmd start` in `gateway` and open http://localhost:5000.
5. Ask "How do I book an appointment?" and then a follow-up. The label reads **AI application guide** when a provider is configured; actual successful replies confirm connectivity. Invalid credentials, quota exhaustion or network problems produce a retryable error, never a fake answer.

The startup helper uses the bundled JDK 21 when available and the new `hospital-management-system-ai.jar`. The older JAR is preserved. For an already-configured environment, set `OPENAI_API_KEY`, optionally `MERIDIAN_AI_MODEL`, and run `java -jar hospital-management-system-ai.jar` from the project directory so the existing database is used. Default model: `gpt-4.1-mini`. The API key is server-side only.

## Behavior and limits

### Diagnose a failed reply

Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\CHECK-AI-CONNECTION.ps1` from the project folder. Enter the API key in the hidden prompt. This sends one minimal paid API request and prints only a fixed, safe result code: `AI_OK`, `AI_KEY_INVALID`, `AI_QUOTA`, `AI_ACCESS`, `AI_MODEL`, `AI_REQUEST`, `AI_LIMIT`, or `AI_NETWORK`. Share only that diagnostic message, never the key. `configured:true` on the status endpoint means a key is present, not that OpenAI accepted it.

The startup script also performs this check. A staged `hospital-management-system-ai-update.jar`, if present, is copied over the runnable AI JAR on startup. Stop the previous backend before restarting. Invalid credentials and quota failures require account configuration, not frontend changes. The backend now returns specific sanitized errors instead of hiding every cause behind a generic message.

- OpenAI Responses API, server-side context and the verified `backend/src/main/resources/assistant-knowledge.txt` guide. Maintain this file when workflows change.
- English/Sinhala/Singlish are requested in the model prompt; quality depends on the model. AI answers are not guaranteed correct.
- It explains the application. It cannot read patient records, query live availability or perform bookings/payments. Navigation and access controls remain enforced by the application.
- Only the submitted conversation and the app guide/verified role are sent to the provider. No patient database queries are made. Users should not type private medical details. `store:false` is sent; provider policies still apply.
- Maximum 12 context messages, 2,000 characters per message, 700 output tokens. 12 requests/minute per remote address and 3 concurrent model calls per backend process. Behind the local gateway users share a rate-limit bucket. For public multi-instance hosting add gateway-level identity-aware limits and a spending budget.
- 45-second upstream timeout. Stop cancels the browser request; an already-started provider call may still finish and incur usage. No automatic paid retries.
- Static quick guides remain clearly labeled and usable when AI is disconnected. They are not AI replies.
- Unit/integration tests use a local mock provider, never paid calls or real credentials. Live OpenAI verification requires your configured key.

Optional local-provider support: set `MERIDIAN_AI_PROVIDER=ollama`, `MERIDIAN_AI_ENDPOINT=http://localhost:11434/api/chat` and `MERIDIAN_AI_MODEL` to a locally installed model. The OpenAI startup helper intentionally selects OpenAI.

Official references: https://developers.openai.com/api/docs/quickstart and https://developers.openai.com/api/reference/resources/responses/methods/create
