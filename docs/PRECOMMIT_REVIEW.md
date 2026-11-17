# Pre-commit verification — 16 November 2026

## Outcome

The checks below passed on this Windows PC with Java 21 and Node 24. They establish tested behavior,
not a guarantee that every possible input, concurrent workload or deployment will work perfectly.
No test bookings, payments, accounts or clinical records were inserted into the user's real database.
Browser/API mutations used a separate seeded in-memory H2 instance on port 18084.

| Check | Result |
| --- | --- |
| Backend unit/integration tests | 26 passed, 0 failures/errors/skips |
| Gateway automated tests | 3 passed |
| Additional isolated HTTP workflow checks | 28 passed |
| Authenticated browser routes | 39 routes across all five roles |
| Desktop/mobile route checks | 78 checks at 1440px and 390px; no page errors, failed API responses or horizontal overflow |
| Final frontend production build | Passed |
| Final backend package | Passed |
| Frontend npm audit | 0 reported advisories after dependency updates |
| Gateway npm audit | 0 reported advisories |
| Installed local AI live check | `CHECK-LOCAL-AI.ps1` returned `LOCAL_AI_OK` with a real booking-help reply |
| Source secret-pattern scan | No OpenAI/GitHub token-shaped credentials found in scanned source files; not a comprehensive secret audit |

## Workflows exercised

- Real login and sign-out for Administrator, Doctor, Patient, Receptionist and Pharmacist, using disposable accounts.
- All role sidebars/pages, account page, notifications, charts/lists with seeded API data.
- Patient UI: choose doctor, load available slots, confirm booking, see the confirmation and appointment list.
- Receptionist dropdown: all six doctor names and specializations appear; booking dialog fits a 390px viewport.
- Mobile navigation opens; reduced-motion preference disables transitions.
- Automated receptionist workflow: register patient, book/reschedule/check in, record payment; role restrictions.
- Staff registration, pending approval, rejection, administrator review and subsequent login.
- Pharmacy expired-stock rejection, dispensing, duplicate-dispense rejection and stock adjustment.
- Department creation/update and unauthorized-write rejection.
- Doctor lab order, administrator sample collection/result publication, patient result visibility.
- Admission/discharge with available-bed restoration.
- Genuine PDF invoice response and rejection of another patient's access.
- Refresh-token flow, notification read-all, unauthenticated requests and role restrictions.
- Legacy H2 account schema upgrade: existing account preserved, staff fields created and approval column resized.

## Fixes and submission preparation

- Regression coverage protects the earlier missing-column login fix (`LegacySchemaMigrationTest`).
- Earlier receptionist name mapping and strict Vite port 5173 fixes remain in the tested build.
- Updated React Router DOM to 7.18.5 and Vite to 6.4.6 to remove the reported npm advisories; rebuilt and rechecked every role route.
- Stopped printing the configured demo password during seeding; set Spring web logging to INFO to avoid request DTOs in normal logs.
- JWT secret can be supplied through `MERIDIAN_JWT_SECRET`; existing local demo behavior retained.
- Git ignore rules now cover all generated project JARs, backups, database files, environments, model weights and local tool artifacts.
- Added `VERIFY-PRECOMMIT.ps1`, current source-checkout instructions and a repeatable isolated API workflow script.
- Source build script now refreshes both standard and local-AI JAR names, preventing stale startup artifacts.

The final build was installed in both root JAR filenames, and the normal local-AI backend restarted successfully.
The original real database was retained. A raw backup copy encountered a Windows file lock; that incomplete copy
was removed and replaced by a successful H2 `BACKUP TO` snapshot at
`backups/before-precommit-build-20261116-204830/meridian-consistent.zip` (excluded from Git).
The disposable test server and its browser context were stopped after verification.

## Repeat checks

From the project folder with installed frontend/gateway dependencies:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\VERIFY-PRECOMMIT.ps1
```

For the optional API workflow suite, first start a **disposable** server (never reuse the real database):

```powershell
java -Xmx512m -jar .\backend\target\hospital-management-system.jar --server.port=18084 "--spring.datasource.url=jdbc:h2:mem:precommit-review;DB_CLOSE_DELAY=-1" --spring.jpa.hibernate.ddl-auto=create-drop --app.seed.enabled=true
```

In another terminal run `python scripts/check-isolated-workflows.py`. Stop that test server afterwards.
This script is pinned to localhost:18084 and uses the seeded test credentials. It must not be redirected to the normal application.

## Limits / hosting decisions

- This is a university/local demonstration review, not a production certification or penetration test.
- The requested registration policy allows immediate administrator registration; retain only for a controlled demo.
  A real public deployment needs restricted administrator provisioning, a private JWT key, HTTPS and H2-console hardening.
- MySQL, other operating systems, high concurrency/load, email delivery and external payment processing were not validated here.
  Payment workflows record payments; no external card processor is integrated.
- AI answers cannot be guaranteed correct. English is more reliable than Sinhala/Singlish for the installed small local model.
- Browser route coverage is not exhaustive coverage of every button, data combination or failure scenario.
- The production JS bundle has a non-failing size warning (~516KB before compression).
- Git ignore rules do not remove already tracked files in another checkout. Review staged filenames before committing.
- No commit or push was performed. The exported workspace did not have a `.git` directory at review time.
