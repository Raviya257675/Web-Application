# Current setup and GitHub source checkout

## Existing PC

In the project folder, run `powershell -NoProfile -ExecutionPolicy Bypass -File .\START-LOCAL-AI.ps1`.
Keep that terminal open. In a second terminal, run `cd frontend` then `npm run dev`.
Open http://localhost:5173/login. Do not launch duplicate backend/frontend processes.
Vite deliberately fails if port 5173 is occupied rather than moving to a disallowed origin.
H2 starts with the backend; no separate database service is needed.

## Fresh GitHub checkout

Use Java 21 and Node.js 20 or newer. Install the dependencies and build from the project directory:

```powershell
cd frontend
npm ci
npm run build
cd ..\backend
.\mvnw.cmd verify
cd ..
Copy-Item .\backend\target\hospital-management-system.jar .\hospital-management-system-local-ai.jar
java -jar .\hospital-management-system-local-ai.jar
```

Open http://localhost:8080. Running from the project folder preserves the same `data/meridian` database location.
For development, also run `npm run dev` in `frontend` and open http://localhost:5173.
To use Feedback & Support, run `npm ci` then `npm start` in `gateway` and open http://localhost:5000/support.
The support module is owned by the gateway; it is not a Vite route.

The portable `.tools` runtime/model folder on the original PC is deliberately not committed. On another PC,
install Ollama separately, run `ollama pull qwen3:1.7b`, and keep Ollama serving on http://127.0.0.1:11434.
The backend defaults to this local model. It runs without paid API credits. The original PC's `START-LOCAL-AI.ps1`
expects its adjacent portable `.tools` folder; use the Java command above on a normal source checkout.
Model installation requires internet and adequate storage/RAM. Local AI replies are fallible, especially for Sinhala/Singlish.

## Accounts and data

Automatic demo seeding is disabled. Existing accounts/data remain intact. Patients and administrators can register;
doctor/receptionist/pharmacist applications need administrator approval. Doctor profiles need availability before booking.
For a disposable demonstration only, explicitly set `APP_SEED_ENABLED=true` with an empty test database.
Never delete the real `data` folder to make a test pass.

The current self-registration policy permits immediate administrator accounts, as requested for this university project.
This is a local demonstration policy, not suitable for an unrestricted public hospital deployment. Likewise, the default
JWT signing secret is a demo value: set a private `MERIDIAN_JWT_SECRET` of at least 32 random bytes before hosting.
Do not put its value into Git. H2 console/demo data require separate deployment hardening.

## Verify before committing

Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\VERIFY-PRECOMMIT.ps1`.
It does not create a Git commit or push. For a real AI check, start the backend/Ollama then run `CHECK-LOCAL-AI.ps1`.
Read [PRECOMMIT_REVIEW.md](PRECOMMIT_REVIEW.md) for coverage and limitations.

This exported folder did not contain `.git` at review time. Initialize Git in this project folder if needed, then
review `git status --short` and staged filenames before committing. `.gitignore` excludes databases, backups,
environment files, logs, generated JARs, node_modules, model weights and test artifacts. Ignore rules do not untrack
anything already tracked in another repository. Never commit private patient data, API keys or model downloads.
