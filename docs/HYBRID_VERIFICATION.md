# Hybrid Gateway — Verification Notes

Test date: 2026-10-31. The original source and executable Spring Boot jar were preserved.

## Confirmed / passed

1. `node --check` succeeded for all `gateway/**/*.js` files.
2. `cd gateway && npm test` succeeded (3 test suites, 0 failures):
   - concurrent feedback writes, reload-after-restart, admin status updates, role-based filtering;
   - token delegation to Spring Boot, invalid session and backend-unavailable responses;
   - streaming reverse proxy forwards query parameters, request bodies, bearer token, HTTP status codes, PDF response bytes and content-disposition header, and does not trust spoofed forwarding headers.
3. The existing `hospital-management-system.jar` launched with `--server.port=18080`, returned a successful `GET /api/public/stats`, accepted the seeded admin account at `POST /api/auth/login`, and returned role `ADMIN` from `GET /api/auth/me` using its JWT.
4. The compiled SPA index in `backend/src/main/resources/static/index.html` exactly matches the index embedded in the original jar.

## Not verified in this offline environment

The runtime environment cannot resolve `registry.npmjs.org`; therefore `npm install` for Express, Helmet and Express Rate Limit cannot complete here. An actual end-to-end Express process (port 5000), browser screenshot, and full feedback UX against running Spring Boot are **not verified here**. The project provides `gateway/package.json` so installation on a connected computer is straightforward. Do not claim end-to-end browser verification until `npm install` and the local hybrid runner have been exercised.

## Existing backend caveat (unchanged)

Calling `GET /api/auth/me` without an Authorization header returned HTTP 500 in the existing jar in this smoke test, rather than the more conventional 401. The Express feedback middleware rejects missing headers **before** calling Spring and maps failed identity checks to 401. Fixing the Spring controller's missing-principal handling would require rebuilding the jar; no existing Spring controllers were modified.

## Easy demo checks after installing npm packages

1. Run `START-HYBRID-WINDOWS.bat` (Windows) or `./START-HYBRID-LINUX-MAC.sh` (Linux/macOS).
2. Open `http://localhost:5000/health` (expect `{ "gateway": "UP", "springBoot": "UP" }`).
3. Open `http://localhost:5000`, sign in as patient, then use **Help & feedback**.
4. Submit a feedback form and refresh; verify it persists.
5. Sign in as admin; navigate to `/support`; verify the shared queue and status update.
6. Restart both servers; verify the same feedback remains visible.
