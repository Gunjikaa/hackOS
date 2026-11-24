# 02 — System Design Document

## 1. Architecture goals
Build a secure, maintainable MVP; keep business rules in the backend; use PostgreSQL as source of truth; centralize event-level authorization; avoid infrastructure without a demonstrated need.

## 2. Recommended initial stack

| Area | Recommendation | Real purpose |
|---|---|---|
| Frontend | Next.js App Router + TypeScript | Routing, dashboards, server/client UI and type safety |
| Styling | Tailwind CSS | Responsive consistent styling |
| Components | shadcn/ui selectively | Accessible primitives, not a mandatory dependency |
| Backend | Node.js + Express + TypeScript | REST APIs and business logic |
| Database | PostgreSQL | Relationships, constraints and transactions |
| ORM | Prisma | Schema, migrations and typed queries |
| Validation | Zod | Runtime validation at API boundaries |
| Tests | Vitest, Supertest, Playwright | Unit, API integration and browser E2E |
| Authentication | Server-managed sessions | Revocation and secure browser session handling |
| Email | Transactional email provider behind adapter | Event emails, provider can be changed |
| File storage | Private object storage when uploads go live | Store project files outside relational DB |

Auth.js vs custom backend-owned sessions, hosting provider, email provider and object-storage provider remain implementation decisions. Choose them after defining domain/deployment topology and cost.

## 3. High-level architecture

```text
Browser
  -> Next.js frontend
  -> HTTPS REST API
  -> Express modular monolith
       Auth & access
       Users
       Events
       Registration
       Teams
       Submissions
       Judging
       Communication
       Notifications
       Audit
  -> Prisma
  -> PostgreSQL

Express -> email adapter -> transactional email provider
Express -> storage adapter -> private object storage (when needed)
```

Frontend and backend are logically separate. They may be hosted separately or together. Do not split into microservices for MVP.

## 4. Suggested repository

```text
hackos/
  frontend/
    src/app/
    src/components/
    src/features/
    src/lib/
  backend/
    src/config/
    src/middleware/
    src/modules/
      auth/ users/ events/ registrations/ teams/
      submissions/ judging/ communication/
      notifications/ audit/
    prisma/
    tests/
  docs/
  README.md
```

Each backend module can have routes, controller, service, schema, repository (only if useful), types and tests. Controllers translate HTTP; services own business rules. Avoid empty abstractions and circular dependencies.

## 5. Authentication and authorization
Use server-managed sessions in secure cookies: `HttpOnly`, `Secure` in production, appropriate `SameSite`, expiry, rotation/revocation and CSRF protection where needed. Hash passwords with Argon2id or bcrypt configured appropriately. Reset tokens must be random, hashed at rest and expire.

Authorization is event-scoped and deny-by-default:
- Resolve current user from session.
- Resolve event membership from database.
- Check role and resource ownership.
- Verify resource belongs to the requested event.
- Never trust a user ID, role or ownership value supplied by the browser.
- A judge sees only assigned submissions; a participant sees only their own support tickets.

## 6. Communication architecture
Communication is an integrated module, not a separate service. Keep domain entities separate:
- Announcement: official organizer-authored update.
- Discussion post/reply: event-visible conversation.
- Support ticket/message: private conversation.
- Notification: delivery/read state.

MVP flow: REST request → authentication/validation → event authorization → service → PostgreSQL transaction → notification record → email delivery attempt. Frontend fetches paginated content and refreshes on navigation or periodically. No WebSockets required.

Email must not be part of the critical write. Save the business record first; delivery failure is retried separately. A lightweight database-backed worker/provider integration is sufficient initially. Adopt a transactional outbox and durable queue only if reliability/volume warrants it.

## 7. File uploads
Submission attachments are separate from communication. Validate permission, size, allowed types and file signature where practical. Use private object storage in production; DB stores storage key, filename, MIME, size, uploader and submission ID. Use short-lived signed URLs after authorization. Local filesystem adapter is fine for development. Do not trust client MIME type or store ordinary large files in PostgreSQL. Clean abandoned uploads; consider malware scanning based on risk.

## 8. Search
Start with PostgreSQL filters, indexes and full-text search. Use `ILIKE` for simple small-scale search. Add trigram indexes for fuzzy matching only if needed. Do not add Elasticsearch/OpenSearch for MVP.

## 9. Transactions and concurrency
Use transactions and database constraints for duplicate registration, team invitation acceptance, team-size limits, submission finalization, evaluation submission and result publication. A “count then insert” without locking is unsafe for the final team slot; lock the team row or use an atomic conditional update within a transaction. Handle conflicts and retries.

## 10. MVP deployment
Managed frontend hosting, managed Node hosting for Express, managed PostgreSQL with backups, transactional email provider and private object storage when file uploads are enabled. HTTPS and managed secrets. No Kubernetes, service mesh, multi-region setup or complex cloud architecture.

## 11. Scale path — only after measurement

| Need | Candidate | Trigger |
|---|---|---|
| Expensive repeated reads | Redis cache | Profiling shows indexes/query tuning insufficient |
| Distributed rate limits/shared ephemeral state | Redis | Multiple API instances require shared state |
| Retryable bulk jobs | BullMQ + Redis or managed queue | Lightweight worker/provider integration is insufficient |
| Live chat/presence | WebSockets/Socket.IO | Product adds a validated real-time requirement |
| Large file delivery | Object storage + CDN | File volume/egress warrants it |
| Search relevance | OpenSearch/Elasticsearch | PostgreSQL search no longer meets needs |
| Reproducible multi-service environments | Docker | Environment drift or deployment demands containers |
| Cloud infrastructure control | AWS or another cloud | Specific service/compliance/scale need |
| Horizontal API scale | Stateless API replicas | Load tests and metrics show one instance is inadequate |
| DB bottleneck | Pooling, query tuning, read replicas | Metrics show database saturation |
| Independent module scale/ownership | Service extraction | Concrete deployment/ownership boundary exists |

Keep API instances stateless; PostgreSQL remains source of truth; jobs are idempotent; cache only with invalidation rules; paginate; measure before partitioning. Do not promise capacity without load tests.

## 12. Environment and secrets
Validate required environment variables at startup. Keep `.env` out of Git; commit only `.env.example` with placeholders. Use host-managed secrets in production. Never expose secrets through `NEXT_PUBLIC_*`. Typical config: database URL, session secret, frontend origin, email credentials, storage credentials, app/API URLs and error-reporting config.
