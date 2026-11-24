# 05 — UI/UX Blueprint

## 1. UX principles
Make the next action obvious; keep event context consistent; separate public and private information; prioritize responsive layouts; define loading/empty/error/success/permission states; use accessible semantics, keyboard navigation, labels and visible focus; do not use color alone for status.

## 2. Information architecture

```text
Public: /, /events, /events/[slug], /login, /register
Shared: /dashboard, /profile
Participant: /my-events
  /events/[id]/overview
  /events/[id]/registration
  /events/[id]/team
  /events/[id]/submission
  /events/[id]/announcements
  /events/[id]/discussions
  /events/[id]/support
  /events/[id]/results
Organizer: /organizer/events
  /organizer/events/new
  /organizer/events/[id]/overview
  /settings /registrations /teams /submissions /judges /results
  /announcements /discussions /support /moderation
Judge: /judge/assignments
  /judge/assignments/[assignmentId]
```
Exact routes may change; maintain consistent event navigation.

## 3. Global layout
Desktop: left navigation, top bar with event selector/search/notifications/profile, main content and optional contextual rail. Mobile: compact header and collapsible/bottom navigation; tables become cards or intentional horizontal scroll; no hover-only actions.

## 4. Public experience
**Landing:** product promise, how it works, audiences, featured events and organizer CTA. Avoid unsupported “only platform” claims.
**Discovery:** search, filters (format/date/status/organizer), sorting and event cards with name, organizer, format, dates, registration deadline and CTA.
**Event detail:** banner, organizer, status, timezone-aware dates, format, venue/online instructions, description, eligibility, rules, stages, FAQs and registration CTA. Never expose private participant or organizer data.

## 5. Authentication
Register with minimal fields, login, recovery and verification state. Do not demand unnecessary profile information before it is needed.

## 6. Participant dashboard and journeys
Dashboard shows registered events, pending decisions, invitations, deadlines, announcements and published results.
Registration: event detail → eligibility/rules → form → confirmation → status/next steps.
Team: create/accept invite → team members/leader/slots → invitation management. Explain full-team, expired-invite and ineligible states.
Submission: deadline/timezone → draft → validation → optional upload → preview → confirm → timestamp and edit policy.
Event workspace tabs: Overview, Registration, Team, Submission, Announcements, Discussions, Support, Results.

## 7. Organizer experience
Dashboard metrics must link to actionable filtered views: registrations/approvals, teams, submissions, judging, deadlines and support tickets.
Event creation wizard:
1. Basics (name, description, banner)
2. Format/logistics (online/offline/hybrid, venue, timezone)
3. Dates (event, registration and submission)
4. Eligibility/team settings/approval mode
5. Rules and stages
6. Review, save draft or publish
Registration view: search, filters, detail, approve/reject with reason and controlled CSV export.
Team view: members/invitations and audited exceptional changes.
Submission view: filters, project detail and timestamps.
Judging view: criteria, assignments, progress and result preview/publication.

## 8. Judge experience
Dashboard lists assigned projects and evaluation status. Evaluation page contains project details, rubric criteria, score inputs, feedback, save draft and submit confirmation. Do not expose other judges' scores unless event policy allows.

## 9. Integrated communication UX
**Announcements:** pinned items, category, publish time, read state; organizer composer with preview, category, pin and audience/notification options.
**Discussions:** categorized feed, search, post detail/replies, official-answer marker, report action and organizer moderation controls.
**Support:** participant ticket list/new ticket/private conversation/status; explicit “Only you and authorized event organizers can see this.” Organizer inbox with status/category/age filters, ticket detail and reply composer.
**Notifications:** bell/unread count, recent list, link to authorized resource, mark read/read all.

## 10. Design system
Define typography, spacing, surfaces, radius, focus, elevation and status tokens. Use consistent labels: Pending/Approved/Rejected; Draft/Published/Ongoing/Completed; Open/In Progress/Resolved; Draft/Submitted. Ensure keyboard operation, contrast, semantic headings, field labels, focus visibility and reduced motion.

## 11. Edge states
Design loading, empty, error/retry, forbidden, not found, expired deadline/invitation, network failure, conflict and success. Test: team becomes full during invitation acceptance; registration closes while form open; deadline passes while editing; announcement deleted while viewed; ticket resolved during reply composition; membership removed while user has an old URL.

## 12. Design deliverables before implementation
Low-fidelity wireframes for organizer and participant journeys; desktop/mobile dashboards; event wizard; registration/team/submission/evaluation; announcement/discussion/support screens; component inventory and design tokens; clickable prototype for core flows.
