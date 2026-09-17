# Current task — signup recovery and reference-inspired onboarding

## User direction
User speaks Bengali. They approved best-judgment work, requested onboarding inspired by the uploaded reference, and urgently reported signup/system failure. Fix authentication first; retain all existing core routes/features. Pause after first verified value addition before broad redesign.

## Confirmed current blocker
- `/app/backend/.env` and `/app/frontend/.env` are absent.
- Backend required `MONGO_URL`, `DB_NAME`, `JWT_SECRET` unavailable; worker import fails at db.py:13 with KeyError MONGO_URL. Supervisor RUNNING is the parent process, not evidence of a healthy API.
- Frontend api.ts references missing `EXPO_PUBLIC_BACKEND_URL`.
- Two read-only troubleshooting investigations found no recoverable original configuration. Do not repeat searches unless configuration changes.
- Auth playbook reviewed: preserve accounts/contracts/hashes; no guessed DB URL, new database, or JWT rotation without explicit authorization.
- No application code or environment files modified in these audit turns. Signup remains BLOCKED, not fixed. No current API/functional UI tests completed.

## Existing auth contracts to preserve
POST /api/auth/register {email,password,name} -> {token,user}; POST /api/auth/login {email,password} -> {token,user}; GET /api/auth/me Bearer token -> user. New users route to /onboarding, existing configured users to /(tabs)/connect. Existing credentials in test_credentials.md are historical, unverified on this environment.

## Visual reference
Asset: https://customer-assets-v7afamib.emergentagent.net/job_elevate-familiar/artifacts/8enbp5b5_e49b338e108972bc4251847b53ba4ff3%20%281%29.jpg
Analyzed: lime/black/white, bold compact headlines, diverse photo collage, rounded CTA and option cards, explicit progress. Use inspiration, not exact logo/photos/copy/compositions. Existing onboarding data and navigation must remain functional.
Current main app: sky-blue light / navy dark, Inter typography, 8/16/24 radius scale, five tabs Chats/Connect/Moments/Voice/Me. Do not adopt stale purple/emerald PRD descriptions as source of truth. SDK57/RN0.86.3/React19.2.3 already declared, verify before any upgrade.

## Protected configuration — NEVER MODIFY during app-code work
- `/app/frontend/metro.config.js`
- `/app/frontend/package.json` main = expo-router/entry, preinstall/postinstall required hooks
- Existing event-target-shim patch under frontend/patches; do not remove
- `/app/frontend/.env` framework host/proxy/API URLs and `/app/backend/.env` database URL (currently missing; restoration needs approved source)
- `/app/config.json`, `/app/entrypoint.sh`, platform supervisor routing and ports
- Existing iOS/Android app identifiers, deep-link scheme until a specifically approved migration
- `.git` and `.emergent` directories; no git writes
- `test_result.md` Testing Protocol block
Pre-existing working-tree edits in tests/reports/PRD/platform files are not ours; do not revert.

## Next step
User explicitly selected option A: restore original configuration, NOT reprovision or rotate JWT keys. They again reported "Sign up login not working". Rechecked: both .env files still absent and same import failure. Latest troubleshooting reports current local Mongo has only system databases; this does NOT establish loss of any external/original database. No code, key, database, or environment changes made. Support guidance requested for platform-level original project environment recovery; support tool provides guidance only and did NOT create a ticket or restore anything. It recommends contacting support@emergent.sh with job b6fa62e5-6b4e-4ef1-a6e8-9e4c1ae8fdfb. Do not repeat exhaustive recovery searches without new configuration/source information. Once approved original config is restored: backend testing first, then request UI testing permission, validate signup -> onboarding -> persistence/login. Signup/login remain BLOCKED. Reference-inspired onboarding remains unimplemented.
