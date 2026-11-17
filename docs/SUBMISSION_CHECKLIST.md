# Submission Checklist — EC4307 Mini Project

> Historical coursework checklist: use [CURRENT_SETUP.md](CURRENT_SETUP.md) and [PRECOMMIT_REVIEW.md](PRECOMMIT_REVIEW.md) for the current five-role build, Git initialization, tests and local AI setup. Do not use the reset instructions below on a database you want to keep. This exported copy does not include Git history; demo seeding is disabled by default.

Deadline: **on or before 31 October 2026**. Rename every file with your **index number**.

## 1. What to submit

| Item | Where | Limit | This project |
|---|---|---|---|
| GitHub repository link | Google Sheet (link in the rubric) | Public or examiner-accessible | Push the included source |
| Mini project report | Upload | **Maximum 10 pages** | `docs/EC4307_Mini_Project_Report.pdf` — **6 pages** |
| Demonstration video | Upload | **Maximum 5 minutes**, camera on | Follow `docs/DEMO_SCRIPT.md` (4 min 40 s) |

Rename before uploading, for example:

- `EC4307_Report_<IndexNumber>.pdf`
- `EC4307_Demo_<IndexNumber>.mp4`

## 2. Push the project to GitHub

The project is already a Git repository with one commit. From the project folder:

```powershell
git remote add origin https://github.com/<your-username>/meridian-hms.git
git branch -M main
git push -u origin main
```

If you prefer the VS Code UI: **Source Control** → **Publish to GitHub** → choose a repository name →
push. Then copy the repository URL into the submission sheet.

Before pushing, replace `[Your Name]` and `[Index Number]` in:

- `docs/EC4307_Mini_Project_Report.docx` (title table + properties)
- `README.md` (optional footer/author)

Rebuild the PDF after editing the DOCX, or edit the DOCX and export again.

## 3. Verify the rubric evidence (30 marks)

| Criterion | Marks | Evidence to show / mention |
|---|---|---|
| Create | 4 | Admin → Appointments → New appointment; Patient → Book a visit; `POST /api/appointments` |
| Read | 4 | Status tabs, search, sort, **View** details; `GET /api/appointments` |
| Update | 4 | **Move** (reschedule) and **Complete**; `PATCH /{id}/reschedule`, `/{id}/complete` |
| Delete | 4 | Cancel then **Delete**; `DELETE /api/appointments/{id}` with safety guards |
| Validation & error handling | 2 | Required/min/email checks, disabled slots, 409/401 JSON errors, global handler |
| Database design | 4 | `docs/ERD.md`, Figure 1, 25 tables, PK/FK/unique constraints, `NUMERIC(12,2)` |
| UI/UX & responsiveness | 2 | Role sidebars, design tokens, mobile card layout, screenshot in report |
| Code quality & structure | 2 | Layered packages, DTOs, services, 7 unit tests, Git history |
| Documentation | 2 | `README.md` (setup), `docs/ERD.md`, `docs/API.md`, screenshots, report |
| Demonstration | 2 | `docs/DEMO_SCRIPT.md`, camera on, under 5 minutes |

## 4. Final pre-submission checks

- [ ] `java -jar hospital-management-system.jar` starts cleanly on a machine with Java 21+.
- [ ] Fresh start seeds the demo hospital (log shows `Seed complete`).
- [ ] All three demo logins work: `admin@`, `doctor@`, `patient@hospital.test` / `Password123!`.
- [ ] Report PDF is **≤ 10 pages** and opens correctly.
- [ ] Video is **≤ 5 minutes**, camera visible, audio clear, index number stated.
- [ ] GitHub repository opens in a private/incognito window.
- [ ] Files are renamed with your index number.
- [ ] Google Sheet submission completed before the deadline.

## 5. Reset the demo before recording or demonstrating

```powershell
# stop the running app with Ctrl+C first
Remove-Item -Recurse -Force .\data
java -jar .\hospital-management-system.jar
```

The seeder creates 14 users, 15 appointments, 5 invoices, 13 medicines, 20 beds, 6 lab orders,
notifications and audit entries — enough for every screen to look alive.

## 6. If the examiner asks…

**“Where is the database?”** — File-backed H2 at `./data/meridian.mv.db`; MySQL profile included.
**“Show the schema.”** — `docs/ERD.md` and `/h2-console` (`jdbc:h2:file:./data/meridian`, user `sa`).
**“Show authentication.”** — JWT access + refresh tokens, BCrypt, `JwtAuthFilter`, `@PreAuthorize`,
plus service-level ownership checks.
**“Show validation.”** — Bean Validation on request records and business rules in services; test a
duplicate booking or an overpayment to see a `409`.
**“Show tests.”** — `cd backend` then `.\mvnw.cmd test` → 7 passing tests.
**“Show the API.”** — `http://localhost:8080/swagger-ui.html`.
