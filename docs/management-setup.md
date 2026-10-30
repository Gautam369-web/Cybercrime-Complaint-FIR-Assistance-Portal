# Local complaint management

This implementation runs locally, with SQLite (WAL mode), private disk files, password accounts and a human review workflow. No external hosting or database account is required. Use Node 24 or later. Storage is free on your own disk, not unlimited cloud storage.

## Start

Run `npm run api` in one terminal and `npm run dev -- --port 5174` in another. Open http://127.0.0.1:5174/#account. The API binds only to 127.0.0.1:5175; Vite proxies /api. Copy `.env.example` to `.env` for settings. Private data and secrets are ignored by Git.

Register an account through the UI. To grant a trusted registered account administrator access, run `npm run admin:grant -- your-email@example.com` locally. There is no default admin password or public role-assignment endpoint. Sign in and choose Admin review queue. Account creation currently does not verify email ownership or real-world identity.

## Workflow

Applicants submit a title, original narrative, consent and optional AI-processing consent. The Review screen can transfer existing guided answers using “Send to review portal”. Evidence must be added in the management page after submission; guest-tab files are not automatically transferred. Private PNG, JPEG and PDF files are accepted up to 5 MB each, 10 per complaint. Files are served as downloads after access checks, never as public URLs. File signatures are checked, but malware scanning is not implemented.

Every submission starts pending_review. Only an admin can approve, request changes, reject, start processing or close it. Reasons and messages are visible in the applicant timeline. Users can reply to requests for changes. Original submissions remain intact. Reopening is available through permitted transitions. The dashboard refreshes every 15 seconds and currently shows the latest 100 records. Portal approval is not police approval, an FIR, or official reporting.

## Gemini

Disabled by default. Human review does not depend on Gemini. The administrator may request screening only with applicant consent. To enable, supply GEMINI_API_KEY and a currently available GEMINI_MODEL server-side, then set GEMINI_ENABLED=true and GEMINI_PAID_SERVICE=true only after configuring an appropriate billing-enabled project and reviewing Google's terms. Never use VITE_ variables for secrets. Restart the API after changes.

Gemini receives only the narrative (which may still contain personal data), not evidence files or the separately collected victim/contact fields. Its prompt distinguishes abusive spam from explicit victim evidence. Structured output contains a moderation suggestion, reason, summary and missing-information questions. All outputs are advisory and rendered as plain text. Model failures, blocks, invalid output and timeouts leave the complaint in the human queue. AI never changes application status. The live Gemini call is unverified until a key/model is configured. Image/video moderation and automated identity verification are not implemented.

## Security and production limits

Passwords use salted scrypt. Only hashes of random session tokens are stored; sessions expire after eight hours. Cookies are HttpOnly and SameSite=Strict. Mutating requests enforce the configured origin. Server-side ownership/role checks cover records, files and admin actions. Login, submission and AI calls are rate-limited. Data is persisted outside the web root. SQLite and local files are not application-encrypted at rest; use OS disk encryption and access controls. Never expose the development server publicly.

This is a functioning local management foundation, not a production-certified government service. Before real public use: email verification/recovery, MFA for admins, malware scanning, storage quotas/retention/deletion, audit-log tamper protection, backups and restore exercises, pagination, operational monitoring, a privacy/legal review, and external security testing are needed. Local sessions have no email recovery flow yet. Database/files should be backed up together while the API is stopped. No real police status API is connected.

Supabase is a possible hosted migration path (Postgres, Auth, Storage with access policies), not configured in this version. Its free tier has limits and inactivity policies; do not promise unlimited or guaranteed-speed hosting.

Sources: https://supabase.com/pricing ; https://ai.google.dev/gemini-api/terms ; https://ai.google.dev/gemini-api/docs/structured-output
