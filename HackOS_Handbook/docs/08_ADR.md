# 08 — Architecture Decision Records

## ADR-001: Communication is an integrated HackOS module
**Status:** Accepted. It shares event identity, membership, permissions, navigation, DB and notifications; it is not a separate product/service. Revisit only if a genuine product boundary emerges.

## ADR-002: Modular monolith first
**Status:** Accepted. One backend with clear domain modules gives simpler transactions and operations. Microservices are deferred until independent scaling/deployment/ownership is demonstrated.

## ADR-003: PostgreSQL is source of truth
**Status:** Accepted. Relational integrity, transactions, indexes and adequate initial search. Revisit only if measured workloads demand another system.

## ADR-004: No Redis by default
**Status:** Accepted. No current requirement justifies it. Revisit for measured caching, distributed limits or shared ephemeral state.

## ADR-005: No SQS/queue by default
**Status:** Accepted. Start with DB-backed email-delivery records and a lightweight worker/provider integration. Revisit when retry volume/reliability needs exceed it.

## ADR-006: No WebSockets in communication MVP
**Status:** Accepted. REST and refresh are sufficient for announcements, discussions and support. Revisit for validated live chat or collaboration.

## ADR-007: TypeScript across frontend/backend
**Status:** Proposed baseline. Next.js and Express share language and static checking. Revisit only for a concrete constraint.

## ADR-008: Prisma with PostgreSQL
**Status:** Proposed. Productive schema/migration workflow; use custom SQL migrations for advanced constraints Prisma cannot express.

## ADR-009: Payments and automatic team matching deferred
**Status:** Accepted. Avoid payment/refund/reconciliation and matching complexity until validated demand.

## ADR-010: File bytes outside PostgreSQL
**Status:** Accepted. DB stores metadata; local adapter for development and private object storage in production.

## ADR-011: Backend-owned PostgreSQL session store
**Status:** Accepted. Backend-owned PostgreSQL session store using Prisma. Store hashed tokens, use HTTP-only cookies, implement expiration, revocation, and CSRF protection. Revisit only if distributed session scaling requires a dedicated session service.

## ADR-012: Single-role event membership with capability-based permissions
**Status:** Accepted. `UNIQUE(event_id, user_id)` constraint. One role per user per event. Additional capabilities, such as organizer judging access, must be handled through explicit permissions rather than duplicate membership records.

## ADR-013: Globally unique event slugs
**Status:** Accepted. Globally unique `Event.slug` for event URLs and routing (`/events/[slug]`).

## ADR-014: npm workspaces for monorepo package management
**Status:** Accepted. npm workspaces managing `frontend` and `backend` packages without introducing extraneous workspace toolchain dependencies.

## ADR-015: Development API proxying via Next.js rewrites
**Status:** Accepted. Next.js rewrites proxying `/api/*` to the Express backend on `http://localhost:5000/api/*`. Frontend runs on port 3000. Treats cookies as first-party (`SameSite=Lax`) and eliminates CORS friction during development.
