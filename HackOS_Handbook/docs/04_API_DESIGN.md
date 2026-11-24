# 04 — API Design

**Style:** REST/JSON over HTTPS; prefix `/api/v1`.

## 1. Conventions
- IDs are opaque UUIDs; timestamps ISO 8601 UTC.
- Authenticated user comes from session, never request body.
- Validate all input with Zod.
- Paginate feeds and large tables.
- Consistent error envelope:
```json
{"error":{"code":"FORBIDDEN","message":"You do not have permission.","requestId":"..."}}
```
- Status codes: 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500.
- Never expose password hashes, session tokens, invitation token hashes or storage credentials.

## 2. Authentication/profile
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `PATCH /users/me`

## 3. Events
- `GET /events` — published discovery.
- `POST /events` — create.
- `GET /events/:eventId`
- `PATCH /events/:eventId`
- `POST /events/:eventId/publish`
- `POST /events/:eventId/archive`
- `GET /events/:eventId/members`
- `POST /events/:eventId/judge-invitations`

## 4. Registration and teams
- `POST /events/:eventId/registrations`
- `GET /events/:eventId/registrations`
- `PATCH /registrations/:registrationId/status`
- `GET /events/:eventId/registrations/export`
- `POST /events/:eventId/teams`
- `GET /events/:eventId/teams`
- `POST /teams/:teamId/invitations`
- `POST /team-invitations/:token/accept`
- `POST /team-invitations/:token/decline`
- `GET /teams/:teamId`
- `PATCH /teams/:teamId`

## 5. Submissions and judging
- `POST /teams/:teamId/submission`
- `POST /submissions/:submissionId/submit`
- `GET /events/:eventId/submissions`
- `GET /submissions/:submissionId`
- `POST /submissions/:submissionId/files/upload-intent`
- `POST /submissions/:submissionId/files/:fileId/complete`
- `POST /events/:eventId/criteria`
- `POST /events/:eventId/judge-assignments`
- `GET /judges/me/assignments`
- `GET /judge-assignments/:assignmentId`
- `PUT /judge-assignments/:assignmentId/evaluation`
- `POST /judge-assignments/:assignmentId/evaluation/submit`
- `POST /events/:eventId/results/publish`

## 6. Communication
Announcements:
- `GET /events/:eventId/announcements`
- `POST /events/:eventId/announcements`
- `GET /announcements/:id`
- `PATCH /announcements/:id`
- `DELETE /announcements/:id`
- `POST /announcements/:id/read`

Discussions:
- `GET /events/:eventId/discussions`
- `POST /events/:eventId/discussions`
- `GET /discussions/:postId`
- `PATCH /discussions/:postId`
- `DELETE /discussions/:postId`
- `GET /discussions/:postId/replies`
- `POST /discussions/:postId/replies`
- `POST /replies/:replyId/official-answer`
- `POST /moderation/reports`
- `GET /events/:eventId/moderation/reports`
- `POST /moderation/reports/:reportId/action`

Private support:
- `GET /events/:eventId/support-tickets`
- `POST /events/:eventId/support-tickets`
- `GET /support-tickets/:ticketId`
- `POST /support-tickets/:ticketId/messages`
- `PATCH /support-tickets/:ticketId/status`
- `POST /support-tickets/:ticketId/reopen`

Notifications:
- `GET /notifications`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`

## 7. Authorization rules
- Participant: own registration/team/submission and own support tickets; event-visible communication.
- Organizer: manage only events where organizer membership exists; event support inbox and moderation.
- Judge: assigned submissions and own evaluations only.
- Team leader: team invitations and submission actions for own team.
Every request checks event membership, resource-to-event relationship and ownership. Return 404 for inaccessible private resources when appropriate.

## 8. Implementation rules
Use transactions for multi-row operations; idempotency where retries may duplicate actions; rate-limit login, registration, invitations, posting and ticket creation; limit body/upload sizes; do not leak private ticket data in generic event endpoints.

### Example: create discussion
Request:
```json
{"title":"Can we refine our project idea?","content":"We want to adjust our problem statement.","category":"EVENT_RULES"}
```
Response:
```json
{"data":{"id":"uuid","eventId":"uuid","title":"Can we refine our project idea?","category":"EVENT_RULES","createdAt":"2026-11-23T12:00:00Z"}}
```

### Example: create support ticket
Request:
```json
{"category":"REGISTRATION","subject":"Confirmation missing","message":"I submitted the form but received no confirmation."}
```
Response:
```json
{"data":{"id":"uuid","status":"OPEN","createdAt":"2026-11-23T12:00:00Z"}}
```
The API must never expose another participant's ticket content.
