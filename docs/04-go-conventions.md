# Go Conventions

## Core principle

Go is not an OOP language. Do not port Java/Spring patterns (Repository, Service, Manager, Factory) into the code. The package is the namespace and the identifier — not the type name.

---

## Package structure

Flat packages per domain under `internal/`:

```
internal/
  issues/
    issues.go               # types, errors, public API
    store.go                # SQL persistence (private)
    store_integration_test.go
  projects/
    projects.go
    store.go
    store_integration_test.go
  boards/
    ...
```

**Rules:**
- One package per domain, not per technical layer.
- Do not create subdirectories inside a domain package (`internal/issues/repository/` is wrong).
- Do not create a `store` package that mixes all domains.

---

## Domain / persistence separation within a package

### `<domain>.go` — domain
Contains:
- Domain types (`Issue`, `MoveIssueParams`, etc.)
- Domain errors (`ErrIssueNotFound`)
- Business validations (`func (p MoveIssueParams) Validate() error`)
- Public package API (`func MoveIssue(ctx, db, p)`)

### `store.go` — persistence
Contains:
- Private SQL functions (`func moveIssue(ctx, db, p)`)
- Internal mapping types (`type issuePosition struct`)
- Implementation constants (`const reorderOffset`)

Does not contain:
- Business validations
- Domain types
- Exported functions

---

## Functions vs methods

Prefer free functions that receive their dependencies as parameters:

```go
// correct
func MoveIssue(ctx context.Context, db *sqlx.DB, p MoveIssueParams) error

// incorrect — unnecessary struct just to carry db
type Store struct { db *sqlx.DB }
func (s *Store) MoveIssue(ctx context.Context, p MoveIssueParams) error
```

Use a struct only when you need to carry **mutable state** across multiple operations, or when there is more than one dependency that is configured once (HTTP server, external client, etc.).

---

## Naming

| OOP pattern (avoid) | Idiomatic Go |
|---|---|
| `NewIssueRepository(db)` | `issues.New(db)` or directly `issues.MoveIssue(ctx, db, p)` |
| `type IssueRepository struct` | `type Store struct` or remove the struct |
| `type IssueService struct` | functions in the `issues` package |
| `IssueManager`, `IssueHandler` | descriptive function names |

If a constructor exists, call it `New`. The main type of the package reflects what it is, not the pattern it implements.

---

## Interfaces

Define interfaces **only when needed**:
- At least two concrete implementations, or
- A real need to inject a mock in tests.

Do not define preventive interfaces. In Go, interfaces are defined on the consumer side, not the producer side.

```go
// incorrect — interface with no real consumer
type IssueStorer interface {
    MoveIssue(ctx context.Context, p MoveIssueParams) error
}

// correct — only when there is a concrete need
```

---

## Persistence

- Explicit SQL: no heavy ORM, use `sqlx`.
- SQL functions are private to the package.
- Input validation happens in the domain before reaching persistence.

---

## Tests

### Files per package

```
internal/issues/
  issues_test.go              # unit tests — domain logic, no DB
  store_integration_test.go   # integration tests — real PostgreSQL
```

### Unit tests (`issues_test.go`)

- Test pure domain logic: validations, business rules, types.
- No database, no external dependencies.
- Always **table-driven**.

```go
func TestMoveIssueParams_Validate(t *testing.T) {
    tests := []struct {
        name    string
        p       MoveIssueParams
        wantErr bool
    }{
        {"valid params",           MoveIssueParams{ProjectID: "p", IssueID: "i", TargetPosition: 0}, false},
        {"missing project_id",     MoveIssueParams{ProjectID: "", IssueID: "i"},                     true},
        {"negative target_position", MoveIssueParams{ProjectID: "p", IssueID: "i", TargetPosition: -1}, true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := tt.p.Validate()
            if (err != nil) != tt.wantErr {
                t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

### Integration tests (`store_integration_test.go`)

- Test persistence against real PostgreSQL.
- Require `MINI_JIRA_TEST_DSN`; automatically skipped if not set (`t.Skip`).
- Deterministic tests go in a single **table-driven** `TestX`.
- Concurrency tests go as separate functions (goroutines and channels don't fit table-driven).

#### Table-driven structure for integration tests

```go
func TestMoveIssue(t *testing.T) {
    db := openTestDB(t)    // once per TestX
    ensureSchema(t, db)    // once per TestX

    tests := []struct {
        name    string
        arrange func(*testing.T, *sqlx.DB, projectSeed) (MoveIssueParams, func(*testing.T))
        wantErr error
    }{
        {
            name: "within same status",
            arrange: func(t *testing.T, db *sqlx.DB, seed projectSeed) (MoveIssueParams, func(*testing.T)) {
                a := insertIssue(t, db, seed, ...)
                b := insertIssue(t, db, seed, ...)
                p := MoveIssueParams{..., IssueID: b, TargetPosition: 0}
                return p, func(t *testing.T) {
                    assertOrder(t, fetchStatusOrder(...), []orderedIssue{{ID: b, Pos: 0}, {ID: a, Pos: 1}})
                }
            },
        },
        {
            name:    "issue not found",
            wantErr: ErrIssueNotFound,
            arrange: func(t *testing.T, db *sqlx.DB, seed projectSeed) (MoveIssueParams, func(*testing.T)) {
                return MoveIssueParams{..., IssueID: "00000000-0000-0000-0000-000000000000"}, nil
            },
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            seed := seedProject(t, db)  // fresh project per case, automatic cleanup
            p, check := tt.arrange(t, db, seed)
            err := MoveIssue(context.Background(), db, p)
            if !errors.Is(err, tt.wantErr) {
                t.Fatalf("MoveIssue() error = %v, wantErr = %v", err, tt.wantErr)
            }
            if check != nil {
                check(t)
            }
        })
    }
}
```

**Key points:**
- `arrange` returns the call parameters **and** an assert closure that captures the inserted IDs.
- `seedProject` is called inside each subtest — isolated data, cleanup via `t.Cleanup` + cascade delete.
- `db` and `ensureSchema` are created once outside the loop to avoid reconnecting on each case.
- If the case only checks for an error, `check` is `nil`.
