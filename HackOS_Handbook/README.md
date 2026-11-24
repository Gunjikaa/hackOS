# HackOS — Product & Engineering Handbook
**Baseline:** v1.0 · **Date:** 23 November 2026

HackOS is one integrated, college-first hackathon management application. Communication is a core module inside HackOS, not a separate product. This handbook is the baseline for product scope, architecture, database, APIs, UX, security, delivery and future scale.

## Documents
- `docs/01_PRD.md` — product vision, users, MVP requirements, rules and acceptance criteria.
- `docs/02_SYSTEM_DESIGN.md` — architecture, technology choices, module boundaries, integrations and scale.
- `docs/03_DATABASE_DESIGN.md` — entities, relationships, constraints, indexes and transactions.
- `docs/04_API_DESIGN.md` — REST conventions, endpoint inventory and access control.
- `docs/05_UI_UX_BLUEPRINT.md` — navigation, pages, journeys, components and interaction states.
- `docs/06_SECURITY_QUALITY.md` — security, privacy, testing, operations and release gates.
- `docs/07_ROADMAP_FUTURE.md` — delivery phases, future features and upgrade triggers.
- `docs/08_ADR.md` — architecture decision records and rationale.

## Confirmed decisions
- Initial audience: college hackathons, societies, technical clubs and innovation cells.
- Event formats: online, offline and hybrid.
- Payments: later, not MVP.
- Automatic team matching: later; manual team creation/invitations are MVP.
- Communication MVP: announcements, public discussions/replies, private organizer support, official answers and notifications.
- No real-time chat, DMs or team chat in MVP.
- Start with a modular monolith and PostgreSQL.
- No technology is added just to decorate a resume. Each choice must solve a real requirement.

## Validation hypotheses
The disconnected-tools problem and demand for a unified platform must be validated with 3–5 organizers, 3–5 participants and 1–2 judges. A pilot should measure whether organizers can run a real event with less manual coordination.
