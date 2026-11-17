# Meridian HMS — API Reference

Base URL: `http://localhost:8080/api`

All responses use one envelope:

```jsonc
// success
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 50, "total": 42, "totalPages": 1 } }

// failure
{ "success": false, "error": { "message": "…", "code": "DOCTOR_DOUBLE_BOOKED", "details": ["…"] } }
```

Authenticate with `Authorization: Bearer <accessToken>`. The interactive OpenAPI UI is at
`http://localhost:8080/swagger-ui.html`.

---

## Authentication

### `POST /auth/register` — public

Creates a **patient** account. Registration can never create staff.

```json
{
  "name": "Jane Silva",
  "email": "jane@example.com",
  "password": "Password123!",
  "phone": "+94 77 000 0000",
  "dob": "1994-03-12",
  "gender": "FEMALE"
}
```

Response: `{ user, accessToken, refreshToken }`.

### `POST /auth/login` — public

```json
{ "email": "admin@hospital.test", "password": "Password123!" }
```

### `POST /auth/refresh` — public

```json
{ "refreshToken": "<refresh token>" }
```

Returns `{ accessToken }`. An invalid/expired refresh token returns `401 REFRESH_INVALID`.

### Other auth routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/me` | Current user `{ id, name, email, role, phone, active, patientId, doctorId }` |
| `PATCH` | `/auth/profile` | `{ name, phone }` |
| `PATCH` | `/auth/password` | `{ currentPassword, newPassword }` |
| `POST` | `/auth/logout` | Client-side token disposal |

---

## Public content

| Method | Path | Description |
|---|---|---|
| `GET` | `/public/stats` | `{ departments, doctors, patients, years }` |
| `GET` | `/public/departments` | Active departments with consultant counts |
| `GET` | `/public/doctors?departmentId=` | Public consultant cards |
| `GET` | `/public/doctors/{id}/availability?date=YYYY-MM-DD` | Generated slot list |

Availability response:

```json
{
  "doctorId": 1,
  "date": "2026-11-02",
  "dayOfWeek": "Monday",
  "onLeave": false,
  "windows": [{ "dayOfWeek": 1, "startTime": "09:00", "endTime": "13:00", "slotMinutes": 30 }],
  "slots": [
    { "dateTime": "2026-11-02T09:00:00", "label": "09:00", "available": false, "reason": "booked" },
    { "dateTime": "2026-11-02T10:00:00", "label": "10:00", "available": true }
  ]
}
```

`reason` is one of `booked`, `past`, `leave`, `doctor_unavailable`.

---

## Users, staff & departments — admin

| Method | Path | Description |
|---|---|---|
| `GET` | `/users?role=&search=` | All accounts |
| `GET` | `/users/{id}` | One account |
| `POST` | `/users/staff` | `{ name, email, password, role: ADMIN|DOCTOR, departmentId?, specialization?, consultationFee? }` |
| `PATCH` | `/users/{id}/status` | `{ active: true|false }` |
| `GET` | `/departments?includeInactive=` | Departments with `doctorCount` |
| `POST` | `/departments` | `{ name, description, consultationFee }` |
| `PATCH` | `/departments/{id}` | Update |
| `DELETE` | `/departments/{id}` | Delete, or deactivate when doctors are attached |

Provisioning a doctor also creates the Doctor profile and a **Mon–Fri 09:00–13:00** rota.

---

## Doctors

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/doctors?departmentId=&search=&includeInactive=` | any | Directory |
| `GET` | `/doctors/me` | doctor | Own profile |
| `GET` | `/doctors/{id}` | any | Profile + rota |
| `GET` | `/doctors/{id}/availability?date=` | any | Slot grid |
| `GET` | `/doctors/{id}/schedule?date=` | admin / self | Day sheet |
| `PATCH` | `/doctors/{id}` | admin / self | Profile, fee, department |
| `PATCH` | `/doctors/{id}/availability` | admin / self | Replace weekly template |
| `DELETE` | `/doctors/{id}` | admin | Deactivate |
| `GET` | `/doctors/{id}/leaves` | admin / self | Leave history |
| `POST` | `/doctors/{id}/leaves` | admin / self | `{ startDate, endDate, reason }` |
| `GET` | `/doctors/leaves` | admin | All leave requests |
| `PATCH` | `/doctors/leaves/{leaveId}` | admin | `{ status: APPROVED|REJECTED }` |

Availability template body:

```json
{
  "slots": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "13:00", "slotMinutes": 30 },
    { "dayOfWeek": 3, "startTime": "14:00", "endTime": "18:00", "slotMinutes": 30 }
  ]
}
```

`dayOfWeek`: 1 = Monday … 7 = Sunday.

---

## Patients

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/patients?search=` | admin all · doctor treated-only · patient self | Scoped register |
| `GET` | `/patients/me` | patient | Profile + visit/invoice stats |
| `GET` | `/patients/{id}` | ownership enforced | One patient |
| `PATCH` | `/patients/{id}` | admin / self | Demographics, allergies, insurance |
| `DELETE` | `/patients/{id}` | admin | Deactivate the account |

---

## Appointments

### `POST /appointments`

```json
{
  "patientId": 1,
  "doctorId": 1,
  "dateTime": "2026-11-02T10:00:00",
  "durationMinutes": 30,
  "reason": "Follow-up consultation"
}
```

Patients may omit `patientId` (defaults to self) and cannot book for anyone else. Admins must supply
it. The booking response includes the assigned `tokenNumber` and `fee`.

Failure codes: `SLOT_IN_PAST`, `DOCTOR_UNAVAILABLE`, `DOCTOR_ON_LEAVE`, `OUTSIDE_AVAILABILITY`,
`INVALID_SLOT_BOUNDARY`, `DOCTOR_DOUBLE_BOOKED`, `PATIENT_DOUBLE_BOOKED`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/appointments?status=&from=&to=&upcoming=&search=&page=&limit=` | Role-scoped list |
| `GET` | `/appointments/me?status=&upcoming=` | Convenience alias |
| `GET` | `/appointments/{id}` | One appointment (ownership checked) |
| `PATCH` | `/appointments/{id}/cancel` | `{ reason }` — patients limited to the cancellation window |
| `PATCH` | `/appointments/{id}/reschedule` | `{ dateTime, durationMinutes? }` — re-runs availability and clash checks |
| `DELETE` | `/appointments/{id}` | Admin only; only closed appointments without a record or invoice |
| `PATCH` | `/appointments/{id}/complete` | Doctor/admin; returns `{ appointment, invoice }` |
| `PATCH` | `/appointments/{id}/no-show` | Doctor/admin |

Reschedule body:

```json
{ "dateTime": "2026-11-02T10:30:00", "durationMinutes": 30 }
```

The same conflict codes as booking apply (`SLOT_IN_PAST`, `OUTSIDE_AVAILABILITY`,
`DOCTOR_DOUBLE_BOOKED`, `PATIENT_DOUBLE_BOOKED`). A patient can only move a visit up to the
cancellation window; staff can move any booked visit.

Deleting is guarded: `409 APPOINTMENT_STILL_BOOKED` if the visit is still booked,
`409 APPOINTMENT_HAS_RECORD` if a clinical record exists, and `409 APPOINTMENT_HAS_INVOICE` if it has
been billed.

---

## Medical records & prescriptions

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/medical-records` | doctor | Create record (completed, owned appointment) |
| `GET` | `/medical-records?patientId=` | RBAC-filtered | List |
| `GET` | `/medical-records/patient/{patientId}` | ownership | Patient history |
| `GET` | `/medical-records/{id}` | ownership | One record |
| `PATCH` | `/medical-records/{id}` | authoring doctor | Amend |
| `POST` | `/medical-records/prescriptions` | doctor | `{ medicalRecordId, advice, items }` |
| `GET` | `/medical-records/prescriptions?patientId=` | RBAC-filtered | List |
| `GET` | `/medical-records/prescriptions/{id}` | ownership | One prescription |

Create body:

```json
{
  "appointmentId": 5,
  "diagnosis": "Stable angina",
  "symptoms": "Exertional chest tightness",
  "bloodPressure": "128/82",
  "pulse": 74,
  "temperature": 36.7,
  "weight": 79,
  "height": 176,
  "spo2": 98,
  "notes": "ECG shows minor ST depression.",
  "followUpDate": "2026-12-01",
  "advice": "Low-dose aspirin with food.",
  "prescription": [
    { "medicineName": "Atorvastatin 10mg", "dosage": "10 mg", "frequency": "Once at night",
      "durationDays": 30, "quantity": 30, "instructions": "After dinner" }
  ],
  "labTestIds": [1, 2]
}
```

---

## Billing

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/billing?status=&search=&page=&limit=` | role-scoped | Invoice list |
| `GET` | `/billing/summary` | admin | Billed, collected, outstanding, counts |
| `GET` | `/billing/patient/{patientId}` | ownership | Patient invoices + totals |
| `POST` | `/billing/{appointmentId}/generate` | admin | Idempotent generation |
| `GET` | `/billing/invoice/{id}` | ownership | One invoice |
| `GET` | `/billing/invoice/{id}/pdf` | ownership | `application/pdf` download |
| `POST` | `/billing/invoice/{id}/pay` | admin / own patient | `{ amount, method, reference }` |
| `PATCH` | `/billing/invoice/{id}` | admin | `{ discount, items, notes }` (no payments yet) |
| `DELETE` | `/billing/invoice/{id}` | admin | Void (only when unpaid) |

`method`: `CASH`, `CARD`, `UPI`, `INSURANCE`, `BANK_TRANSFER`.

Error codes: `OVERPAYMENT`, `INVOICE_VOID`, `INVOICE_HAS_PAYMENTS`, `INVOICE_ACCESS_DENIED`.

---

## Pharmacy

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/pharmacy/medicines?search=&lowStock=&includeInactive=` | any authenticated | Catalogue |
| `GET` | `/pharmacy/medicines/{id}` | any | One medicine |
| `POST` | `/pharmacy/medicines` | admin | `{ name, sku, category, manufacturer, unit, price, reorderLevel }` |
| `PATCH` | `/pharmacy/medicines/{id}` | admin | Update |
| `POST` | `/pharmacy/medicines/{id}/stock` | admin | `{ batchNo, quantity, expiryDate, reason }` |
| `GET` | `/pharmacy/medicines/{id}/batches` | any | Batches, earliest expiry first |
| `GET` | `/pharmacy/movements?medicineId=&limit=` | any | Stock ledger |
| `GET` | `/pharmacy/alerts` | any | `{ lowStock, expiringSoon }` |
| `POST` | `/pharmacy/dispense` | admin | `{ prescriptionId, notes }` |
| `GET` | `/pharmacy/dispenses` | admin / patient | Dispense history |

Dispensing consumes batches **FEFO**, creates OUT movements and refuses insufficient stock
(`INSUFFICIENT_STOCK`). Medicines missing from the catalogue are returned in `warnings`.

---

## Laboratory

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/lab/tests?includeInactive=` | any | Catalogue |
| `POST` | `/lab/tests` | admin | `{ code, name, category, price, sampleType, referenceRange, unit, turnaroundHours }` |
| `PATCH` | `/lab/tests/{id}` | admin | Update |
| `POST` | `/lab/orders` | doctor | `{ patientId, testId, priority }` |
| `GET` | `/lab/orders?status=` | role-scoped | Orders |
| `GET` | `/lab/orders/{id}` | ownership | One order |
| `PATCH` | `/lab/orders/{id}/collect` | admin | `{ technician }` |
| `PATCH` | `/lab/orders/{id}/result` | admin | `{ resultValue, resultUnit, referenceRange, remarks }` |
| `PATCH` | `/lab/orders/{id}/cancel` | admin | Cancel a non-completed order |

Statuses: `ORDERED → COLLECTED → COMPLETED`, or `CANCELLED`.

---

## Wards, beds & admissions

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/wards?includeInactive=` | any | Wards with bed counts |
| `POST` | `/wards` | admin | `{ name, type, floor, description }` |
| `PATCH` | `/wards/{id}` | admin | Update |
| `GET` | `/wards/{id}/beds` | any | Bed map |
| `POST` | `/wards/{id}/beds` | admin | `{ code, dailyCharge }` |
| `GET` | `/wards/beds/available` | staff | Available beds |
| `PATCH` | `/wards/beds/{bedId}` | admin | `{ code, dailyCharge }` |
| `PATCH` | `/wards/beds/{bedId}/status` | admin | `{ status: AVAILABLE|MAINTENANCE }` |
| `GET` | `/wards/occupancy` | any | Occupancy summary + wards |
| `GET` | `/wards/admissions?status=` | role-scoped | Admissions |
| `POST` | `/wards/admissions` | admin / doctor | `{ patientId, doctorId, bedId, diagnosis, notes }` |
| `GET` | `/wards/admissions/{id}` | ownership | One admission |
| `POST` | `/wards/admissions/{id}/discharge` | admin / doctor | `{ notes }` → `{ admission, nights, invoice }` |

---

## Notifications & audit

| Method | Path | Description |
|---|---|---|
| `GET` | `/notifications` | Current user's notifications |
| `GET` | `/notifications/unread-count` | `{ count }` |
| `PATCH` | `/notifications/{id}/read` | Mark one read |
| `POST` | `/notifications/read-all` | Mark all read |
| `GET` | `/audit?action=&entity=&actor=&limit=` | Admin audit trail |

Notification types: `APPOINTMENT`, `BILLING`, `LAB`, `PHARMACY`, `ADMISSION`, `SYSTEM`.

---

## Dashboard

`GET /dashboard` returns a role-aware payload:

- **Admin**: counts, revenue, beds, 7-day trends, status breakdown, department load, recent
  appointments, low stock, pending labs, active admissions.
- **Doctor**: counts, today's appointments, next appointment, weekly trend, recent records,
  pending labs, leave.
- **Patient**: profile, counts, outstanding balance, next appointment, active admission, recent
  records/invoices/prescriptions/labs.

---

## Error codes you may see

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body failed validation (see `details`) |
| `INVALID_BODY` | 400 | Malformed JSON or an invalid enum value |
| `UNAUTHORIZED` | 401 | Missing/expired access token |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `ACCOUNT_DISABLED` | 403 | Deactivated user |
| `FORBIDDEN` | 403 | Role not allowed |
| `PATIENT_ACCESS_DENIED` | 403 | No treatment relationship |
| `NOT_FOUND` | 404 | Unknown id |
| `EMAIL_TAKEN` | 409 | Duplicate account |
| `DOCTOR_DOUBLE_BOOKED` | 409 | Doctor already booked |
| `PATIENT_DOUBLE_BOOKED` | 409 | Patient already booked |
| `OUTSIDE_AVAILABILITY` | 409 | Outside published hours |
| `INVALID_SLOT_BOUNDARY` | 409 | Not on the slot grid |
| `CANCELLATION_WINDOW_CLOSED` | 409 | Too late for patient self-cancellation |
| `INSUFFICIENT_STOCK` | 409 | Pharmacy stock too low |
| `BED_OCCUPIED` | 409 | Bed already taken |
| `OVERPAYMENT` | 409 | Payment exceeds the balance |
| `INTERNAL_ERROR` | 500 | Unexpected server error (logged) |
