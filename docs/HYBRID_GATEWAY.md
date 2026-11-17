# Meridian HMS — Option A: Express/Node Gateway + Spring Boot

## Architecture (implemented)

```text
Browser / React SPA ── http://localhost:5000 ──┐
                                              │
                         Node.js + Express Gateway
                         ├── GET / and React SPA routes → built React assets
                         ├── /api/* → reverse proxy to Spring Boot (streamed)
                         ├── POST /engage/feedback → independent persistent service
                         ├── GET /engage/feedback/mine → user's requests
                         ├── GET /engage/feedback → ADMIN's full queue
                         ├── PATCH /engage/feedback/:id → ADMIN status updates
                         ├── GET /support → support UI
                         └── GET /health → backend connectivity check
                                              │
                                http://127.0.0.1:8080
                                   Spring Boot 3.5
                                    ├── JWT / login
                                    ├── all hospital modules
                                    ├── JPA / Hibernate
                                    └── H2 (or MySQL)
```

The gateway uses **Express on the Node.js runtime**, not two separate technologies. It is a second runnable backend application alongside Spring Boot. This **is not a full MERN backend**: MongoDB is NOT included, and hospital business data stays in Spring Boot/H2 (or MySQL). Feedback has its own file-backed JSON persistence under `gateway/data/feedback.json` and is never stored in the hospital database. This is an educational single-process datastore, not a production multi-instance datastore.

## Start from Windows

Requirements: **JDK 21+**, **Node.js 20+ and npm**. Internet access is required for the FIRST `npm install`. From the project root:

1. Double-click `START-HYBRID-WINDOWS.bat`. It installs gateway dependencies once (if missing), launches Java in a separate window and starts Node/Express.
2. Open **http://localhost:5000** (**NOT 8080** for the hybrid demo).
3. Sign in with one of the demo accounts described in the root README.
4. Click the **Help & feedback** button (lower right), or go to **http://localhost:5000/support**.
5. Submit a feedback ticket as a patient or doctor. Sign in as admin to see the shared queue and change ticket status.
6. Close BOTH terminal windows to stop both servers.

### Linux/macOS

```bash
chmod +x START-HYBRID-LINUX-MAC.sh
./START-HYBRID-LINUX-MAC.sh
```

### Manual start (two terminals)

```bash
# terminal 1 — project root
java -jar hospital-management-system.jar

# terminal 2 — project root
cd gateway
npm install
npm start
```

Visit `http://localhost:5000`.

If Spring Boot is already using port 8080, don't start a second copy. You can run the gateway separately with `npm start`.

## Demonstrating the two backends

| Action / route | Implemented by | Persistence |
|---|---|---|
| `GET /` and `GET /patient` | Express serves built React assets; React Router renders screen | n/a |
| `POST /api/auth/login` | Express proxies to Spring Boot | H2 / MySQL |
| `GET /api/doctors`, `/api/appointments`, etc. | Express proxies to Spring Boot | H2 / MySQL |
| `GET /api/billing/invoice/{id}/pdf` | Express proxies binary PDF from Spring Boot | H2 / MySQL |
| `POST /engage/feedback` | Express, not Spring Boot | JSON file |
| `GET /engage/feedback/mine` | Express (signed-in owner's items only) | JSON file |
| `GET /engage/feedback` | Express (ADMIN only) | JSON file |
| `PATCH /engage/feedback/{uuid}` | Express (ADMIN only) | JSON file |
| `GET /health` | Express connectivity probe | n/a |

### Feedback API examples

First sign in against `POST http://localhost:5000/api/auth/login` to get the Spring `accessToken`. In the examples, substitute your real token for `TOKEN` (never hardcode it into source):

```bash
curl http://localhost:5000/health

curl -X POST http://localhost:5000/engage/feedback \
  -H 'Authorization: Bearer TOKEN' -H 'Content-Type: application/json' \
  -d '{"category":"TECHNICAL","subject":"My page did not load","message":"The dashboard showed a loading spinner."}'

curl http://localhost:5000/engage/feedback/mine -H 'Authorization: Bearer TOKEN'

# ADMIN access token required:
curl http://localhost:5000/engage/feedback -H 'Authorization: Bearer ADMIN_TOKEN'
curl -X PATCH http://localhost:5000/engage/feedback/UUID \
  -H 'Authorization: Bearer ADMIN_TOKEN' -H 'Content-Type: application/json' \
  -d '{"status":"RESOLVED"}'
```

Valid categories: `GENERAL`, `APPOINTMENT`, `BILLING`, `TECHNICAL`, `SUGGESTION`. Valid statuses: `OPEN`, `IN_PROGRESS`, `RESOLVED`. Subject maximum 120 characters; message maximum 2000 characters.

## Authentication and security

- **Same login**: the gateway forwards hospital API requests with the original `Authorization: Bearer <token>` header, and validates feedback callers by asking Spring Boot's `/api/auth/me` endpoint. **No second users table / token / password store**.
- **Authorisation**: regular users see only their own feedback; `ADMIN` (verified by Spring each request) sees all and can update status.
- **Security headers**: Helmet sends CSP and other web-security headers.
- **Rate limiting**: Express rate-limit, 400 API calls and 30 engagement calls per IP every 15 minutes (in-memory, single process).
- **Input checks**: categories, non-empty subject/message, strict length bounds, request size 16 KB, HTML rendered with `textContent` not unsafe HTML insertion.
- **Persisted disk state**: feedback saved atomically on each mutation; sequential writes protect against lost updates inside one Node process. Backup `gateway/data` if persistence is needed.
- **Privacy**: avoid including personal medical details in support requests. `feedback.json` includes submitted text and user's name; treat it as private. The demo setup is not suitable for real patient data.
- **Caution**: The Spring Boot demo uses seed accounts, has an example JWT secret, an enabled H2 console, and exposes Java on 8080. For production, disable seed accounts/H2 console, use secrets from the environment, TLS, proper database access and audit policies, and bind Spring Boot to an internal interface. Local demonstration only.

## Source structure

```text
gateway/
├── package.json              # Express, helmet, express-rate-limit
├── src/
│   ├── server.js             # startup and configuration
│   ├── app.js                # Express routes, middleware, SPA hosting
│   ├── proxy.js              # streaming Java API proxy
│   ├── upstream.js           # validate JWT with Spring identity
│   └── store.js              # disk persistence and status updates
├── public/
│   ├── support.html          # browser form and admin queue
│   ├── support.css
│   ├── support.js
│   └── support-link.js       # unobtrusive link on the React shell
├── test/
│   ├── store.test.js
│   ├── upstream.test.js
│   └── proxy.test.js
└── data/                     # auto-created, contains feedback.json
```

## Test & limitations

```bash
cd gateway
npm test            # Node built-in tests: persistence, token delegation, HTTP proxy, binary PDFs
# optional when npm dependencies are installed:
npm start
```

The existing React build and executable Spring Boot jar are **preserved** from the original ZIP. You do NOT have to recompile React or Java to use the gateway. For React source changes in the future, from `frontend/` use `npm install && npm run build` to regenerate `backend/src/main/resources/static` (the jar is not automatically rebuilt).

The feedback file store supports one Node process. For multi-machine deployment use MySQL/PostgreSQL (or another transactional persistent DB) rather than a shared JSON file. Rate limits are per process; distributed deployments need a shared rate-limit store. The login is shared when browsing via the gateway's port `5000` (browser localStorage is separate for port `8080`).
