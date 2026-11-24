# 06 — Security, Quality & Operations

## 1. Security baseline
Deny by default. Authenticate private requests. Authorize every resource read/write. Validate untrusted input. Minimize personal data. Keep secrets out of source control. Log security-relevant actions without logging secrets or private message bodies.

## 2. Threats and controls
- Broken access control/IDOR: event membership, ownership and resource relationship checks on every request.
- Role escalation: derive role from DB, never client body.
- Password compromise: Argon2id/bcrypt, login throttling, secure reset, session revocation.
- Session theft: HTTPS, HttpOnly/Secure/SameSite cookies, expiry/rotation.
- CSRF: CSRF token/origin checks for cookie-authenticated state changes.
- XSS: output encoding; sanitize any allowed rich text.
- SQL injection: parameterized ORM; careful raw SQL.
- Spam: rate limits, reporting, moderation.
- Malicious uploads: size/type/signature checks, private storage, safe headers and scanning if warranted.
- Invitation abuse: high-entropy token, hash at rest, expiry, revocation, one-time use.
- Export leakage: permission checks, minimal columns and audit exports.
- Secret leakage: environment-managed secrets, secret scanning and rotation.

## 3. Privacy
Collect only needed information. Explain collection purpose. Restrict participant lists and exports. Keep support private. Avoid sensitive details in email subjects/previews. Define retention, deletion, export and backup policies before public launch. Do not include private support messages in general exports.

## 4. Upload controls
Allowlist types, enforce size, verify signatures where practical, generate storage keys, store privately, authorize signed downloads, prevent executable inline serving, clean pending uploads and consider malware scanning based on risk.

## 5. Testing
**Unit:** state transitions, timezone/deadline boundaries, permission helpers, score aggregation, invitation expiry and notification recipients.
**API integration:** duplicate registration, cross-event access, team capacity/concurrency, deadline enforcement, judge assignment access, private ticket isolation, announcement permissions and moderation.
**E2E:** organizer creates event → participant registers/approved → team formed → submission → judge evaluates → results published; plus announcement, public discussion/official answer and private support.
**Negative security tests:** tamper event IDs, read another ticket, view unassigned project, self-approve, race for final team slot, submit after deadline by changing browser clock, modify another user's post, mark official answer without permission.

## 6. Release quality gates
TypeScript build/lint pass; tests pass; critical E2E pass; migrations apply from empty DB; no secrets committed; no unresolved critical/high vulnerabilities; responsive and keyboard smoke tests pass; backup restore process documented.

## 7. Observability
Start with structured logs/request IDs, error tracking, host health checks, DB backup status and basic latency/error/email-failure metrics. Never log passwords, cookies, raw invitation tokens, signed URLs or private support text. Add tracing/centralized metrics/alerting when operational complexity warrants it.

## 8. Backup and recovery
Use managed PostgreSQL backups, define recovery point/time objectives before production, periodically test restore, align file-storage retention/versioning with DB retention. A backup is not proven until restoration succeeds.
