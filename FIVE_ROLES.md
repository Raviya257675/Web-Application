# Five-role hospital workflow

Restart the backend and gateway after this upgrade. Open http://localhost:5000/register and choose Patient, Doctor, Administrator, Receptionist or Pharmacist.

Patients and administrators can sign in immediately after registration. Doctor, receptionist and pharmacist applications require approval under Admin → Staff & access → Review application. Existing pending administrator accounts are activated on startup. Doctors and pharmacists supply a professional registration number. Administrators verify credentials themselves; verification is not connected to an external licensing authority. Doctors select an existing department and publish their availability after approval.

For the first hospital administrator, stop the backend and run `powershell -ExecutionPolicy Bypass -File .\SETUP-ADMIN.ps1` from the project folder. Enter your own email and password. This creates an administrator or approves a pending Administrator application with matching credentials. It starts the backend; keep the gateway running in its own terminal.

Receptionists can register patients, edit contact details, book/reschedule/cancel visits, check in today's patients, mark past visits as no-shows, search invoices, record payments already received, download PDF receipts, view payment history and check available beds. Clinical records and staff administration are restricted.

Pharmacists can maintain medicines, receive batches, inspect expiry and low-stock alerts, dispense prescriptions, review dispensing/stock history and write off expired or damaged stock. Duplicate dispensing and insufficient unexpired stock are rejected. Stock and payment updates use database locks.

All roles have notifications, profile editing and password changes. Existing doctor, patient and administrator modules remain available. Existing accounts and records are preserved; startup expands the legacy database role column.

Validation: 12 backend tests passed, including role approval, permissions, reception booking/payment flows and pharmacy expiry/duplicate checks. The frontend builds successfully. A copied legacy H2 database was upgraded and verified for existing-account login and new receptionist registration. MySQL migration is included but was not verified against a live MySQL server.

This is a substantial local application upgrade, not a certification for clinical deployment. External licensing verification, payment processing, email verification and password-reset email delivery are not implemented. Counter payment entries record received funds. Review deployment security and hospital operating requirements before using real patient data.
