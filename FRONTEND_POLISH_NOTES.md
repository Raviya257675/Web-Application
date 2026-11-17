# Meridian HMS - Frontend-only visual polish

**This package includes runnable visual changes:** the existing Spring Boot-compiled React UI now loads `/visual-polish.css` and `/visual-polish.js` and the bundled local `/visuals/healthcare-team.svg` asset. These are served by the existing Express gateway on port 5000.

## Frontend changes
- A local, self-contained healthcare illustration on the landing page and sign-in/sign-up sidebar.
- Soft animations, subtle scroll reveals, premium gradients, card hover feedback, responsive button effects, improved field focus states, and role-navigation highlights.
- Source-level React visual components in `frontend/src/components/MedicalVisuals.jsx` and corresponding tweaks to `Landing.jsx`, `Login.jsx`, `Register.jsx`, and `app.css`.
- All images are bundled locally, so no external image services or API keys are needed.
- Reduced-motion accessibility preference respected for added runtime animations.

## How to run
1. Extract the ZIP.
2. Double-click `START-HYBRID-WINDOWS.bat` (requires Java 21+, Node.js 20+, and npm).
3. Open http://localhost:5000. First gateway start needs internet for npm dependencies.
4. Verify the landing page, sign-in form, admin dashboard and existing CRUD flows.

## Source rebuilds
Runtime polish is already in the compiled static frontend used by the hybrid launcher. The full extra React illustration components are also included as source. To create a new compiled bundle from source later, install frontend dependencies and use `npm run build`, then deploy the build output into `backend/src/main/resources/static`.

## Preservation
No Spring Boot controller, service, repository, entity, config, SQL, H2/MySQL database, Express gateway backend source, or executable JAR has been changed. Only frontend React sources, frontend static assets, and the documentation note are modified. No routes or API calls were altered.
