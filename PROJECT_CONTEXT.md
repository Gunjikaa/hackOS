# HackOS — Context & Architecture Blueprint

## 1. Product Overview
HackOS is an integrated, college-first hackathon and event lifecycle management platform. It centralizes event operations: creation, discovery, registration, team formation, project submissions, rubric-based judging, and contextual communication into a unified workspace.

## 2. Core Architecture Decisions
* **Architecture:** Modular Monolith (ADR-002). Clear domain boundaries within a single Express backend.
* **Source of Truth:** PostgreSQL (ADR-003). Relational constraints, ACID transactions, foreign keys.
* **ORM:** Prisma with PostgreSQL (ADR-008). Custom SQL migrations when partial indexing or complex constraints are required.
* **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS (ADR-007).
* **Backend:** Node.js + Express + TypeScript (ADR-007).
* **Authentication:** Backend-owned PostgreSQL session store using Prisma (ADR-011). Hashed tokens, HTTP-only SameSite cookies, session expiration and revocation.
* **Authorization:** Event-scoped permissions (`UNIQUE(event_id, user_id)` per ADR-012). Role derived strictly server-side.
* **Slugs:** Globally unique `Event.slug` (ADR-013).
* **Development Proxy:** Next.js rewrites proxying `/api/*` to Express on `http://localhost:5000/api/*` (ADR-015).
* **Communication:** Integrated HackOS module (ADR-001) covering Announcements, Categorized Discussions with Official Answers, and Private Organizer Support Tickets. No WebSockets in MVP (ADR-006).

## 3. Monorepo Structure
```text
hackOS/
├── docs/                 # Product & Engineering Handbook
├── frontend/             # Next.js App Router, Tailwind CSS, TypeScript
├── backend/              # Node.js, Express, TypeScript, Prisma
├── .env.example          # Environment variable template
├── package.json          # Root npm workspace configuration
└── PROJECT_CONTEXT.md    # Architecture and operational status
```

## 4. Current Status
* **Phase:** Phase 1 — Foundation & Modular Monolith Scaffolding.
* **Completed:** ADR records, root workspace setup, environment contract, backend/frontend scaffold.
* **Next Steps:** Proceed through vertical feature slices (Auth -> Events -> Registrations -> Teams -> Submissions -> Judging -> Communication -> Dashboards -> Hardening).
