# Running with personal accounts

The login page has no demo buttons or displayed passwords. Choose **Create an account**, enter your patient details and your own password, confirm the password, then sign in. Registration does not sign you in automatically. Duplicate email addresses and incorrect passwords are rejected.

Accounts are stored in the H2 database, not in the browser. Passwords are stored as BCrypt hashes, not readable passwords. With the commands below, the database is `data/meridian.mv.db` inside this project folder. It survives application and computer restarts. Do not delete the data folder. Browser storage contains the signed-in session, not your password.

## Run on Windows

Stop any older backend and gateway terminals with Ctrl+C before starting the updated JAR.

Terminal 1 (PowerShell):

```powershell
cd "C:\Users\MSI\Downloads\Meridian_HMS_Final_Polished_Project\Meridian-HMS-SpringBoot"
java -jar .\hospital-management-system.jar
```

Wait for `Started HmsApplication`. Terminal 2:

```powershell
cd "C:\Users\MSI\Downloads\Meridian_HMS_Final_Polished_Project\Meridian-HMS-SpringBoot\gateway"
npm.cmd start
```

Open http://localhost:5000/register. If an old page is cached, press Ctrl+F5. Sign out of any previous session before creating a new account. Use the same project directory each time so the backend opens the same database.

## Hospital administrator and doctors

Public registration creates patients only. Hospital administrators create staff through the Staff page. To provision your own administrator locally, stop the backend and run this in Terminal 1 from the project root:

```powershell
$env:APP_ADMIN_EMAIL = Read-Host 'Your administrator email'
$adminPassword = Read-Host 'Choose an administrator password (12 to 72 UTF-8 bytes)' -AsSecureString
$env:APP_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $adminPassword).Password
try { java -jar .\hospital-management-system.jar }
finally { Remove-Item Env:APP_ADMIN_EMAIL, Env:APP_ADMIN_PASSWORD -ErrorAction SilentlyContinue }
```

While this runs, sign in using that email and password. An existing email is never overwritten or promoted. After stopping this first run, use the normal startup command; the administrator is saved in the database.

Automatic demo seeding is disabled by default. Existing records, including any older demo accounts, are preserved. An administrator can deactivate old demo staff accounts through Staff. These changes implement local account registration/login; email verification and password-reset email delivery are not included.

## Rebuilding

Use JDK 21 for source builds. Java 27 is incompatible with the project's current Lombok version. Build the frontend with `npm.cmd ci` and `npm.cmd run build`, then run Maven `clean package` in `backend` and copy `backend/target/hospital-management-system.jar` over the root JAR after stopping the old app. The prebuilt JAR already includes the frontend.
