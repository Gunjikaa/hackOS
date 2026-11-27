# HackOS

HackOS centralizes the operational lifecycle of college hackathons into a single workspace: event creation, participant vetting, transactional team formation, deadline-enforced submissions, rubric-based judging, and integrated event communication.

---

## Architecture at a Glance

* **Monorepo:** npm workspaces (`frontend`, `backend`).
* **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS.
* **Backend:** Node.js, Express, TypeScript (Modular Monolith).
* **Database & ORM:** PostgreSQL, Prisma ORM.
* **Session Store:** PostgreSQL-backed sessions with HTTP-only cookies.
* **API Proxy:** In development, Next.js rewrites `/api/*` to `http://localhost:5000/api/*`.

---

## Directory Structure

```text
hackOS/
├── docs/                 # Complete Product & Engineering Handbook (PRD, Design, ADRs)
├── frontend/             # Next.js App Router frontend
├── backend/              # Express + Prisma backend
├── PROJECT_CONTEXT.md    # System context and architectural invariants
├── .env.example          # Configuration template
└── package.json          # Monorepo workspace configuration
```

---

## Getting Started

### 1. Prerequisites
* **Node.js:** v20+ (recommended v22 LTS)
* **npm:** v10+
* **PostgreSQL:** v15+ database running locally or remotely

### 2. Setup Environment
```bash
# Copy example environment configuration
cp .env.example backend/.env
```
Update `backend/.env` with your PostgreSQL database credentials and session secret.

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Servers
```bash
# Run backend (port 5000)
npm run dev:backend

# Run frontend (port 3000)
npm run dev:frontend
```

---

## Documentation
See [`docs/`](file:///docs/) for full specifications:
* [`01_PRD.md`](file:///docs/01_PRD.md) — Product requirements and acceptance criteria
* [`02_SYSTEM_DESIGN.md`](file:///docs/02_SYSTEM_DESIGN.md) — System architecture and technology decisions
* [`03_DATABASE_DESIGN.md`](file:///docs/03_DATABASE_DESIGN.md) — Schema, relationships, and constraints
* [`04_API_DESIGN.md`](file:///docs/04_API_DESIGN.md) — REST endpoints and error conventions
* [`05_UI_UX_BLUEPRINT.md`](file:///docs/05_UI_UX_BLUEPRINT.md) — User journeys, layout, and design system
* [`06_SECURITY_QUALITY.md`](file:///docs/06_SECURITY_QUALITY.md) — Threat models, testing, and quality gates
* [`07_ROADMAP_FUTURE.md`](file:///docs/07_ROADMAP_FUTURE.md) — Delivery phases and scale triggers
* [`08_ADR.md`](file:///docs/08_ADR.md) — Architecture decision records
