# Email OTP Backend Contract

The current Vite app has no backend server in this repository. The frontend OTP service in `src/services/emailOtp.ts` is backend-ready and will call a real API when `VITE_AUTH_API_BASE_URL` is configured.

## Environment

```env
VITE_AUTH_API_BASE_URL=https://your-api.example.com
```

## Required Endpoints

### POST `/api/auth/send-otp`

Request:

```json
{
  "email": "student@example.com",
  "username": "NeoLearner",
  "purpose": "register"
}
```

Success response:

```json
{
  "ok": true,
  "expiresAt": 1735689900000,
  "cooldownUntil": 1735689630000,
  "message": "Verification code sent to your email."
}
```

Backend requirements:

- Generate a cryptographically secure 6-digit OTP.
- Hash the OTP before saving it.
- Store `email`, `otp_hash`, `expires_at`, `attempts`, `consumed_at`, and `created_at`.
- Expire OTPs after 5 minutes.
- Enforce a resend cooldown, recommended 30 seconds.
- Invalidate previous active OTPs for the same email and purpose before creating a new one.
- Send the email through SMTP, SendGrid, Resend, Mailgun, SES, or similar.
- Log delivery failures with request ID and provider response.

### POST `/api/auth/verify-otp`

Request:

```json
{
  "email": "student@example.com",
  "code": "123456",
  "purpose": "register"
}
```

Success response:

```json
{
  "ok": true,
  "status": "verified",
  "message": "Email verified successfully."
}
```

Failure responses:

```json
{ "ok": false, "status": "invalid", "message": "Incorrect code. 4 attempts remaining." }
{ "ok": false, "status": "expired", "message": "This verification code expired. Please request a new code." }
{ "ok": false, "status": "locked", "message": "Too many incorrect attempts. Please request a new code." }
{ "ok": false, "status": "missing", "message": "No verification request was found. Please request a new code." }
```

Backend requirements:

- Find the latest active OTP for email and purpose.
- Reject if missing, expired, consumed, or attempt limit exceeded.
- Compare hashed code using a timing-safe comparison.
- Increment attempts on invalid codes.
- Mark OTP as consumed after success.
- Mark user email as verified in the users table.
- Return normalized error messages for frontend display.

## Suggested Database Tables

```sql
alter table users
add column email_verified boolean default false,
add column email_verified_at timestamptz;

create table email_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null,
  otp_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_otps_email_purpose_idx on email_otps(email, purpose, created_at desc);
```

## Email Service Checklist

- SMTP host, port, username, password/API key configured in backend environment.
- `from` address verified with the email provider.
- DKIM/SPF configured for production deliverability.
- Rate limit OTP sends by email and IP.
- Log provider errors and message IDs.
- Never send or store plaintext OTPs in production logs.
