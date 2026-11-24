# 07 — Roadmap, Future Scope & Scale

## 1. Delivery method
Build vertical slices that include UI, API, database, permissions, validation and tests. Avoid building all screens before integration.

## 2. Phases and exit criteria
0. **Validation/design:** interview organizers, participants and judges; confirm workflows; PRD, wireframes, schema and API contracts. Exit: at least one organizer reviews the scope.
1. **Foundation:** repo, Next.js, Express, TypeScript, PostgreSQL, Prisma, Zod, logging and seed data. Exit: migrations and frontend-to-API-to-DB path work.
2. **Auth/access:** registration/login/session, profile, event membership and authorization. Exit: negative access tests pass.
3. **Events/discovery:** event CRUD, publish, details, search and filters. Exit: organizer publishes a public event.
4. **Registration:** forms, approvals, participant list, export and notifications. Exit: duplicate/window rules pass.
5. **Teams:** create, invitations, acceptance and capacity. Exit: concurrency and membership invariants pass.
6. **Submissions:** draft/finalize, deadlines and optional file storage. Exit: reliable end-to-end submission.
7. **Judging:** criteria, assignments, evaluations, aggregate and publish results. Exit: judge isolation passes.
8. **Communication:** announcements, discussions/replies, official answers, private support, moderation and notifications. Exit: privacy boundaries pass.
9. **Dashboards/polish:** actionable dashboards, accessibility, responsive and edge states.
10. **Pilot/hardening:** deployment, security review, backup restore, E2E and one college pilot. Exit: event runs without manual DB edits.

## 3. Future product scope
**P1:** college/organization accounts, multiple organizer permissions, event templates/cloning, QR attendance if needed, configurable registration questions, notification preferences/digests, analytics/exports, team matching if validated, team resources/workspace.
**P2:** payments (e.g. Razorpay after refund/reconciliation requirements), real-time chat if demanded, DMs/group channels only with moderation/privacy design, certificates, sponsor management, multi-stage judging, GitHub/calendar integrations, similarity checks with human review.
**P3:** institutional SSO, multi-tenant isolation, audit exports/retention controls, advanced analytics, dedicated search, read replicas/partitioning, multiple worker pools and regional deployment if required.

## 4. Technology upgrades with triggers
- Redis: measured cache need, distributed rate limit or shared ephemeral state.
- BullMQ + Redis or managed queue: retryable jobs exceed lightweight worker reliability/volume.
- WebSockets/Socket.IO: a validated live collaboration requirement.
- Object storage/CDN: file traffic/egress warrants it.
- OpenSearch/Elasticsearch: PostgreSQL search fails measured relevance/performance needs.
- Docker: environment drift or container deployment need.
- AWS/other cloud services: a specific service, compliance, reliability or scaling need.
- Horizontal API replicas: load tests/metrics show one instance insufficient.
- Read replicas/partitioning: measured DB bottleneck and query tuning exhausted.
- Microservice extraction: concrete independent scaling, deployment or ownership boundary.

## 5. Pilot
Run one event with an organizer team, participants and judges. Observe spreadsheet fallback, repeated questions, announcement readership, support resolution, deadline failures, user friction and actual time saved. Sign-ups and compliments alone do not prove value.

## 6. Prioritization
Score feature proposals by pain severity, frequency, users affected, core-event impact, implementation/maintenance cost, security/moderation burden and evidence. Do not add features only because they look impressive in a demo.
