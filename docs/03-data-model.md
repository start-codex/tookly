# Data Model

## Design principle

- An issue belongs to the project (`project_id`), not to a board.
- A status also belongs to the project (`project_id`).
- A board is a view and configuration layer over issues — it is not the owner of work.

---

## Current entities

### Workspace

- `id`
- `name`
- `slug`
- `created_at`

### User

- `id`
- `email`
- `name`
- `password_hash`
- `created_at`

### WorkspaceMember

- `workspace_id`
- `user_id`
- `role` (`owner`, `admin`, `member`)

### Project

- `id`
- `workspace_id`
- `name`
- `key` (e.g. `ENG`, `MKT`) — short uppercase identifier used in issue keys
- `description`
- `created_at`

### ProjectMember

- `project_id`
- `user_id`
- `role` (`admin`, `member`, `viewer`)

### ProjectIssueCounter

- `project_id` (PK)
- `last_number`
- `updated_at`

Used to generate sequential issue numbers per project without race conditions. See implementation note below.

### Status

- `id`
- `project_id`
- `name` (e.g. `To Do`, `In Progress`, `Done`)
- `category` (`todo`, `doing`, `done`)
- `position`

**Note:** when a project is created with a Kanban or Scrum template, statuses are preconfigured automatically. Board column mapping is **not auto-created** by the template.

### IssueType

- `id`
- `project_id`
- `name` (e.g. `Epic`, `Story`, `Task`, `Subtask`, `Bug`)
- `icon`
- `level` (hierarchy depth: 0 = top-level, higher = deeper child)

### Board

- `id`
- `project_id`
- `name`
- `type` (`kanban`, `scrum`)
- `filter_query` (board-level issue filter)

### BoardColumn

- `id`
- `board_id`
- `name`
- `position`

### BoardColumnStatus

- `board_column_id`
- `status_id`

A column can map to one or more statuses. Both the column and the status must belong to the same project.

### Issue

- `id`
- `project_id`
- `number` (sequential per project)
- `issue_type_id`
- `status_id`
- `parent_issue_id` (nullable) — hierarchy field; full enforcement and UI are planned (Phase 2)
- `title`
- `description`
- `priority` (`low`, `medium`, `high`, `critical`)
- `assignee_id` (nullable)
- `reporter_id`
- `due_date` (nullable)
- `status_position` — sort order within a status column
- `created_at`
- `updated_at`
- `archived_at` (nullable)

Recommended public key in UI/API: `PROJECT_KEY-NUMBER` (e.g. `ENG-123`).

**Note:** `parent_issue_id` and `issue_type.level` exist in the schema today. Full hierarchy domain rules (cycle prevention, level validation) and the corresponding UI are planned in Phase 2.

### IssueEvent (audit log)

- `id`
- `issue_id`
- `actor_id`
- `event_type` (`created`, `updated`, `moved`, `commented`)
- `payload_json`
- `created_at`

---

## Integrity rules

- `Issue.issue_type_id` must belong to the same `project_id` as the issue.
- `Issue.status_id` must belong to the same `project_id` as the issue.
- `Issue.parent_issue_id` must belong to the same project.
- Hierarchy by level: a child issue must have a `level` greater than its parent.
- Anti-cycle: `parent_issue_id` chains must not form cycles.
- `BoardColumnStatus`: column and status must belong to the same project.
- `status_position` is unique per (`project_id`, `status_id`) for active issues (`archived_at IS NULL`).

---

## Suggested indexes

- `Issue(project_id, status_id, status_position)`
- `Issue(assignee_id)`
- `Issue(parent_issue_id)`
- `Status(project_id, position)`
- `BoardColumn(board_id, position)`

---

## Implementation notes

**SQL as source of truth.** Migrations live in `migrations/`. All access from Go uses `database/sql` + `sqlx` with private SQL functions per domain package. No ORM.

**Issue number generation.** Uses a per-project counter in `project_issue_counters`, not `MAX(number)+1`, to avoid race conditions under concurrent inserts:

```sql
INSERT INTO project_issue_counters (project_id, last_number)
VALUES ($1, 1)
ON CONFLICT (project_id)
DO UPDATE SET last_number = project_issue_counters.last_number + 1
RETURNING last_number;
```

The returned `last_number` is used as `issues.number` in the same transaction.

---

## Future model directions

These entities are planned for future phases. Field-level design is intentionally deferred until implementation planning begins.

- **Sprint / SprintIssue** — sprint planning and execution; links issues to time-boxed iterations.
- **Comment** — threaded comments on issues.
- **Attachment** — files attached to issues.
- **CustomField** — per-project extensible fields on issues.
- **ProjectTemplate** — reusable workflow preset that bundles statuses, issue types, board layout, and optionally a documentation structure.
- **Notification** — event-driven alerts for status changes, assignments, mentions.
- **ProjectPage / WikiPage** — documentation pages that belong to a project; support for Markdown content, page hierarchy (parent/child), and decision records.
- **Page–WorkItem link** — an explicit link record between a documentation page and a work item, enabling manual traceability between documented decisions and execution artifacts.
