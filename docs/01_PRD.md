# 01 — Product Requirements Document

## 1. Product summary
HackOS centralizes the operational lifecycle of college hackathons: event creation, registration, teams, submissions, judging, communication and results.

**Positioning:** One workspace for organizers to run hackathons and for participants and judges to complete their event journeys.

## 2. Problem hypothesis
College hackathons may coordinate forms, spreadsheets, WhatsApp/email, submissions and judging through disconnected tools. This can cause duplicated data, missed updates and manual reconciliation. This is a hypothesis to validate, not a proven universal fact.

## 3. Goals and non-goals
### MVP goals
- Organizers create and operate events.
- Participants discover events, register, form teams and submit projects.
- Judges evaluate assigned projects against a rubric.
- Organizers monitor operations and publish results.
- Official updates, public questions and private support stay attached to the event.
- Permissions, deadlines and data integrity are enforced server-side.

### Not in MVP
Payments, automatic team matching, live chat, DMs, team chat, voice/video, native apps, AI judging/moderation, microservices or infrastructure for unmeasured scale.

## 4. Actors and roles
A user can have different roles in different events. Roles are event-scoped.
- **Organizer:** event configuration, participant/team management, announcements, support, judges, results.
- **Participant:** discovery, registration, team, submissions, discussions, support and results.
- **Team leader:** invites members and submits the team's project.
- **Team member:** event/team access and submission status.
- **Judge:** sees assigned projects and submits scores/feedback.
- **Platform administrator:** platform-level abuse/operations; can be an internal/manual function in MVP.

Initial event roles: `ORGANIZER`, `PARTICIPANT`, `JUDGE`. Team leader is a team-membership attribute, not a global role.

## 5. MVP functional requirements

### A. Authentication and access
- Register, login, logout, account recovery and basic profile.
- Secure server-managed sessions.
- Event-scoped memberships and organizer/judge invitations.
- Protected routes and server-side permission checks.
- Users cannot elevate their role by editing client requests.

### B. Event management and discovery
- Create, edit, draft, publish, unpublish and archive events.
- Fields: name, slug, description, banner, format, venue/online instructions, timezone, event dates, registration window, submission deadline, eligibility, rules, FAQs and min/max team size.
- Formats: `ONLINE`, `OFFLINE`, `HYBRID`.
- Registration approval mode: automatic/manual.
- Basic stages and dates.
- Public listing, search and filters for published events.
- Backend validates date relationships and event-state transitions.
- Suggested lifecycle: Draft → Published → Registration Closed → Ongoing → Completed → Archived. Registration, submission and judging have independent states.

### C. Registration
- Event-specific registration form with required participant details.
- States: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.
- Automatic/manual approval, organizer search/filter, CSV export.
- Prevent duplicate registration with a database unique constraint.
- Enforce eligibility and registration window server-side.
- Optional simple registration-code/QR attendance check-in only if the pilot needs it.

### D. Teams
- Approved participant creates a team.
- Team leader invites by link/email; invitee accepts/declines.
- Enforce min/max team size and one active team per participant per event by default.
- Invitation tokens expire and can be revoked.
- Organizers can inspect teams and resolve exceptional membership issues.
- No automatic team matching or team chat in MVP.

### E. Submissions
- Team leader submits by default.
- Fields: title, summary, problem statement, solution, technologies, GitHub/demo/video URLs and optional files.
- Backend enforces deadline using event timezone and server time.
- Configurable edit/resubmission policy before deadline.
- Submission timestamp and confirmation.
- Store file metadata in PostgreSQL and file bytes in private object storage when uploads are deployed.

### F. Judging
- Organizer creates criteria, score bounds and weights.
- Invite judges and assign them to projects.
- Judges see assigned projects only.
- Save draft evaluation, submit scores and written feedback.
- Organizer monitors completion.
- Aggregate submitted scores using a documented rule (initial default: arithmetic average).
- Organizer reviews and publishes results.
- Tie-break and post-submission edit policy must be explicit and audited.

### G. Dashboards and notifications
- Organizer: registrations, approvals, teams, submissions, judging progress, deadlines and support inbox.
- Participant: registered events, status, team, announcements, submission and results.
- Judge: assigned projects and evaluation status.
- In-app notifications and email for meaningful events.
- Email failure must not roll back the business action.

### H. Integrated communication module
Communication is part of the event workspace and reuses HackOS identity, event membership and permissions.

**Announcements**
- Organizer can create/edit/pin/delete official updates.
- Categories: General, Schedule, Rules, Submission, Emergency.
- Participants can view history and mark read.
- Publishing can notify relevant event members.

**Public discussions**
- Event members can create categorized posts and replies.
- Categories: Technical Help, Team Queries, Event Rules, General.
- Paginated feed, basic search and reactions if feasible.
- Organizers can mark a reply as an official answer; surface it in event FAQ.
- Users can report posts/replies; organizers can hide/restore content.
- Users may edit/delete their own content under defined rules.

**Private organizer support**
- Participant creates a ticket with category, subject and description.
- Authorized organizers see an event support inbox and reply privately.
- States: `OPEN`, `IN_PROGRESS`, `RESOLVED`; participant can reopen under policy.
- Only ticket owner and authorized event organizers can read ticket messages.
- Replies/status changes generate notifications.

**Communication exclusions:** no real-time chat, DMs, private team chat, voice/video, typing/presence or generic discussion attachments. Project submission files are a separate capability.

## 6. Core business rules
- One user may hold different roles in different events.
- One registration per user/event.
- Team membership requires approved registration.
- Team-size limits are transactionally enforced.
- One active team per user/event by default.
- Only team leader submits unless explicitly configured otherwise.
- Deadline enforcement is server-side.
- Judges only access assigned projects.
- Results are private until published.
- Event communication requires event membership or explicit public visibility.
- Support tickets are private; announcements/discussions are event-visible.
- Important transitions record actor and timestamp.

## 7. Non-functional requirements
Security and privacy by default; transactional writes for critical operations; pagination and query optimization; accessible keyboard-operable UI; responsive mobile/desktop browser support; typed modular code; UTC timestamps plus event timezone; structured logs without secrets or private message bodies.

## 8. Success metrics
Measure in a pilot: organizer setup time, registration completion/failures, team formation, successful submissions, judging completion, support resolution time, repeated-question/self-service rate, external spreadsheet usage and user satisfaction.

## 9. Release acceptance
MVP is ready for a controlled pilot when core journeys work end-to-end, cross-user/cross-event authorization tests pass, deadlines and concurrency rules are enforced, backups can be restored, and an organizer can run an event without manual database edits.
