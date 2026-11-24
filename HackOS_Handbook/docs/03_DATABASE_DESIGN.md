# 03 — Database Design

**Database:** PostgreSQL · **ORM:** Prisma (proposed) · Logical design, refine during implementation.

## 1. Principles
Use normalized relational tables, foreign keys, unique/check constraints and transactions. Use UUIDs for exposed IDs where appropriate. Store timestamps as UTC `timestamptz`; retain event IANA timezone. Store file bytes in object storage, not ordinary relational rows.

## 2. Entity inventory

### Identity and membership
- `User(id, email UNIQUE, password_hash, email_verified_at, created_at, updated_at, disabled_at)`
- `UserProfile(user_id PK/FK, display_name, college_name, avatar_storage_key, bio)`
- `Session(id/token_hash, user_id, expires_at, created_at, revoked_at)`
- `EventMember(id, event_id, user_id, role, status, created_at)`. Decide whether one row supports one role or multiple roles before migration.

### Events
- `Event(id, owner_id, name, slug, description, banner_storage_key, format, venue, online_instructions, timezone, starts_at, ends_at, registration_opens_at, registration_closes_at, submission_deadline, min_team_size, max_team_size, approval_mode, status, published_at, created_at, updated_at)`
- `EventStage(id, event_id, name, description, starts_at, ends_at, sort_order, status)`
- `EventRule(id, event_id, title, content, sort_order)`

### Registration and teams
- `Registration(id, event_id, user_id, status, form_response JSONB if custom fields are truly needed, registered_at, reviewed_at, reviewed_by)`; unique `(event_id,user_id)`.
- `Team(id, event_id, name, created_by, created_at, updated_at)`
- `TeamMember(id, team_id, event_id, user_id, role, status, joined_at)`; enforce one active team per user/event. A partial unique index may need custom SQL migration.
- `TeamInvitation(id, team_id, event_id, invited_by, invitee_email/user_id, token_hash, status, expires_at, responded_at, created_at)`.

### Submissions and judging
- `Submission(id, event_id, team_id, title, summary, problem_statement, solution, github_url, demo_url, status, submitted_by, submitted_at, updated_at)`; unique `(event_id,team_id)` if one submission/team is MVP rule.
- `SubmissionFile(id, submission_id, storage_key, original_filename, mime_type, size_bytes, uploaded_by, created_at, scan_status)`
- `JudgingCriterion(id, event_id, name, description, max_score, weight, sort_order)`
- `JudgeAssignment(id, event_id, judge_user_id, submission_id, status, assigned_at)`; unique `(judge_user_id,submission_id)`.
- `Evaluation(id, assignment_id, status, feedback, submitted_at, updated_at)`; unique assignment.
- `EvaluationScore(id, evaluation_id, criterion_id, score)`; unique `(evaluation_id,criterion_id)`.

### Integrated communication
- `Announcement(id, event_id, author_id, title, content, category, is_pinned, published_at, created_at, updated_at, deleted_at)`
- `AnnouncementRead(id, announcement_id, user_id, read_at)`; unique `(announcement_id,user_id)`.
- `DiscussionPost(id, event_id, author_id, title, content, category, status, created_at, updated_at, deleted_at)`
- `DiscussionReply(id, post_id, author_id, content, is_official_answer, status, created_at, updated_at, deleted_at)`
- `SupportTicket(id, event_id, participant_id, category, subject, status, assigned_organizer_id, created_at, updated_at, resolved_at, reopened_at)`
- `SupportMessage(id, ticket_id, sender_id, content, created_at)`
- `ModerationReport(id, event_id, reporter_id, target_type, target_id, reason, details, status, reviewed_by, reviewed_at, created_at)`

### Notifications and audit
- `Notification(id, user_id, event_id nullable, type, title, body, target_type, target_id, read_at, created_at)`
- `EmailDelivery(id, notification_id nullable, recipient, template_key, minimal_payload, status, attempt_count, next_attempt_at, sent_at, idempotency_key UNIQUE, last_error_code)`
- `AuditLog(id, event_id, actor_user_id, action, entity_type, entity_id, allowlisted_metadata JSONB, created_at)`

## 3. Relationship map

```text
User --< EventMember >-- Event
Event --< Registration >-- User
Event --< Team --< TeamMember >-- User
Team --< TeamInvitation
Team --0..1 Submission --< SubmissionFile
Event --< JudgingCriterion
Submission --< JudgeAssignment >-- User(Judge)
JudgeAssignment --0..1 Evaluation --< EvaluationScore
Event --< Announcement --< AnnouncementRead >-- User
Event --< DiscussionPost --< DiscussionReply
Event --< SupportTicket --< SupportMessage
User --< Notification
Event --< AuditLog
```

## 4. Constraints and indexes
Unique: user email; event slug (global or organization-scoped decision); registration `(event_id,user_id)`; announcement read `(announcement_id,user_id)`; judge assignment `(judge_user_id,submission_id)`; evaluation assignment; score `(evaluation_id,criterion_id)`; email idempotency key.

Index common query paths: events by status/date and format/date; registrations by event/status/date; team members by event/user/status; submissions by event/status/date; judge assignments by judge/status; announcements by event/published date; discussions by event/category/date/status; replies by post/date; support tickets by event/status/updated date; messages by ticket/date; notifications by user/read/date. Add full-text index only when search is implemented. Validate indexes with actual query plans.

## 5. Critical transactions
- Registration: verify event window/eligibility → insert → notification record → commit. Unique constraint prevents concurrent duplicates.
- Team join: validate invitation and approved registration → lock team/reserve capacity → verify no other active team → insert membership/update invitation → commit.
- Submission: verify leader/team/deadline → validate file metadata → finalize submission and audit → commit. Handle orphaned uploaded objects.
- Evaluation: verify assignment → validate all scores → mark submitted and audit → commit; calculate aggregate from submitted evaluations, never client totals.

## 6. Data lifecycle
Define retention/deletion and export policies before public launch. Restrict CSV exports; audit them. Do not include private support messages in generic exports. Encrypt backups and test restoration. Use custom SQL migrations for partial indexes or constraints Prisma cannot express.
