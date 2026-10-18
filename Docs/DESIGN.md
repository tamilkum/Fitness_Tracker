# Fitness Challenge — Design Document

## a. System Architecture & Data Flow

### High-level architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  Browser (React + TypeScript)                  │
│                                                               │
│  Pages: Login · Dashboard · Activities · Log · Leaderboard   │
│  State: AuthContext (localStorage) · AchievementsSidebar      │
│  HTTP:  services/api.ts  →  fetch()  →  /api/*               │
└───────────────────────┬──────────────────────────────────────┘
                        │  JSON over HTTP (CORS-controlled)
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI / Uvicorn)                  │
│                                                               │
│  main.py  ─►  CORS middleware  ─►  api_router  (/api)        │
│                                                               │
│  Routes  (app/api/routes/)                                    │
│    users · auth · activities · leaderboard                    │
│    dashboard · achievements · chat                            │
│         │                                                     │
│         ▼                                                     │
│  Services  (app/services/)                                    │
│    scoring · milestones · achievements                        │
│    leaderboard · dashboard · coach · chatbot                  │
│         │                                                     │
│         ▼                                                     │
│  Repositories  (app/repositories/)                            │
│    users · activities                                         │
│         │                                                     │
│         ▼                                                     │
│  SQLAlchemy ORM + Session  (app/core/database.py)             │
└───────────────────────┬──────────────────────────────────────┘
                        │  SQL
                        ▼
┌──────────────────────────────────────────────────────────────┐
│           SQLite  (fitness_challenge.db)                       │
│  Tables: users · credentials · activities · achievements      │
│  Schema managed by Alembic (3 migration versions)             │
└──────────────────────────────────────────────────────────────┘
                        │  HTTPS (chatbot only)
                        ▼
              Google Gemini API  (gemini-2.0-flash-exp)
```

The frontend is a single-page React application served by Vite on `localhost:5173`.
The backend is a FastAPI application served by Uvicorn on `localhost:8000`.
CORS is configured to allow requests from `settings.frontend_origin` (default `http://localhost:5173`), `localhost:5173`, and `127.0.0.1:5173`.

### Registration data flow

```
1. User fills the "Create account" form
   (first_name, last_name, email, password, age, DOB, country, state, city, address).

2. Frontend: POST /api/users/  { first_name, last_name }
   Backend:  normalise & casefold names → check uq_user_normalized_name
             → INSERT users row → return UserRead { id (UUID), ... }

3. Frontend: POST /api/auth/create  { user_id, email, password }
   Backend:  verify user_id exists → check no duplicate email
             → bcrypt.hashpw(password, rounds=12)
             → INSERT credentials row → return SignInResponse

4. Frontend: PATCH /api/users/{user_id}  { age, date_of_birth, country, ... }
   Backend:  UPDATE users SET age=…, country=…, …

5. Frontend: AuthContext.login(fullUser) → localStorage["fitness-challenge-user"]
             → React state update → redirect to /dashboard
```

### Activity ingestion data flow

```
1. User submits the "Log an activity" form (sport + matching metric).

2. Frontend: POST /api/activities/
             { user_id, sport, distance_km | duration_seconds | steps, occurred_at? }

3. Backend route:
   a. Verify user exists (404 if not).
   b. Pydantic model_validator checks sport/metric pairing.
   c. calculate_points(sport, …) → pure function → integer points.
   d. INSERT activities row (including points).
   e. evaluate_and_award(db, user_id, sport):
        - SUM cumulative metric for sport
        - milestones_up_to(config, cumulative) → list of reached thresholds
        - diff against existing achievement slugs
        - INSERT new Achievement rows (flush per row, single commit)
   f. Return ActivityRead (with points).
```

---

## b. Database Schema & Data Model

Schema is managed by Alembic migrations (`migrations/versions/`). There are three versioned migration files — see section on Alembic below.

### `users` table

| Column | Type | Constraints |
|---|---|---|
| `id` | VARCHAR(36) | Primary key — UUID string (e.g. `"550e8400-e29b-41d4-a716-446655440000"`) |
| `first_name` | VARCHAR(80) | Not null |
| `last_name` | VARCHAR(80) | Not null |
| `normalized_first_name` | VARCHAR(80) | Not null — `first_name.casefold()` |
| `normalized_last_name` | VARCHAR(80) | Not null — `last_name.casefold()` |
| `age` | INTEGER | Nullable |
| `date_of_birth` | DATE | Nullable |
| `country` | VARCHAR(100) | Nullable |
| `state_province` | VARCHAR(100) | Nullable |
| `city` | VARCHAR(100) | Nullable |
| `house_address` | VARCHAR(255) | Nullable |
| `created_at` | DATETIME(tz) | Not null, server default `now()` |

**Duplicate enforcement:** A `UNIQUE` constraint named `uq_user_normalized_name` covers `(normalized_first_name, normalized_last_name)`. Before insert, the backend case-folds both names (Python `.casefold()`) and collapses whitespace (`" ".join(value.split())`). Any concurrent race that passes the application-level check still fails at the database level, which raises `IntegrityError` → HTTP 409. This is enforced in both `create_user` and `update_user` in the repository layer.

### `credentials` table

| Column | Type | Constraints |
|---|---|---|
| `user_id` | VARCHAR(36) | Primary key + FK → `users.id` (CASCADE DELETE) |
| `email` | VARCHAR(254) | Not null, UNIQUE, indexed |
| `password_hash` | VARCHAR(128) | Not null — bcrypt hash e.g. `"$2b$12$…"` |
| `created_at` | DATETIME(tz) | Not null, server default `now()` |

One row per user (`user_id` is the PK, enforcing 1:1 with `users`). Email is the sign-in identifier; it is stored lower-cased. Passwords are **never stored in plaintext** — bcrypt with 12 work-factor rounds is applied on the backend before the row is inserted. Plaintext passwords never leave the request handler.

### `activities` table

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | Primary key, auto-increment |
| `user_id` | VARCHAR(36) | FK → `users.id` CASCADE DELETE, not null |
| `sport` | VARCHAR(20) | Not null, indexed |
| `distance_km` | NUMERIC(10,3) | Nullable |
| `duration_seconds` | INTEGER | Nullable |
| `steps` | INTEGER | Nullable |
| `points` | INTEGER | Not null, `≥ 0` |
| `occurred_at` | DATETIME(tz) | Not null, indexed |
| `created_at` | DATETIME(tz) | Not null, server default `now()` |

**Check constraints:**
- `ck_activities_sport_metric_pairing` — distance sports (`running`, `walking`, `cycling`) must have `distance_km` non-null and the other two null; duration sports (`gym`, `swimming`) must have `duration_seconds` non-null; `daily_steps` must have `steps` non-null.
- `ck_activities_metric_ranges` — `distance_km > 0`; `duration_seconds BETWEEN 1 AND 86400`; `steps BETWEEN 1 AND 2,000,000`.
- `ck_activities_points_nonnegative` — `points ≥ 0`.

**Index:** `ix_activities_user_occurred_at` on `(user_id, occurred_at)` — composite index accelerates per-user timeline queries sorted by date.

### `achievements` table

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | Primary key, auto-increment |
| `user_id` | VARCHAR(36) | FK → `users.id` CASCADE DELETE, indexed |
| `slug` | VARCHAR(64) | Not null — e.g. `"running_100km"`, `"swimming_60min"` |
| `unlocked_at` | DATETIME(tz) | Not null, server default `now()` |

**Uniqueness:** `UNIQUE(user_id, slug)` named `uq_achievement_user_slug` prevents the same badge being awarded twice to the same user. The award service uses `db.flush()` to detect the constraint early; a concurrent insert that wins the race raises `IntegrityError`, which is caught and silently skipped.

### Entity Relationships

```
users ──┬── credentials   (1:1, user_id is PK+FK in credentials)
        ├── activities     (1:N, FK user_id → users.id CASCADE)
        └── achievements   (1:N, FK user_id → users.id CASCADE)
```

All foreign keys use `ON DELETE CASCADE` — deleting a user removes all their activities, achievements, and credentials automatically.

### Alembic Migration History

The database schema is version-controlled through three Alembic migrations:

| Revision | Description |
|----------|-------------|
| `0001_initial` | Creates `users` and `activities` tables with all indexes and check constraints |
| `0002_add_achievements` | Creates `achievements` table with index and unique constraint |
| `0003_add_profile_location_fields` | Adds `age`, `date_of_birth`, `country`, `state_province`, `city`, `house_address` to `users` |

Each migration file has an `upgrade()` and `downgrade()` function, enabling safe rollback. The `alembic_version` table in the database tracks the currently applied revision. `env.py` reads `settings.database_url` at runtime (overriding `alembic.ini`) and points Alembic at `Base.metadata` for autogenerate support.

---

## c. API Specifications

All routes are prefixed `/api`.  
Request validation errors return `400 Bad Request` (FastAPI's default 422 is mapped to 400 by a custom exception handler in `main.py`).

### Authentication

**`POST /api/auth/create`** — Store hashed credentials after user record is created

Request body:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "alice@example.com",
  "password": "secret123"
}
```

Validation:
- `user_id`: exactly 36 characters (UUID format)
- `email`: valid email address format (Pydantic `EmailStr`)
- `password`: 6–128 characters

Responses:
- `201 Created` — `{ "user_id": "…", "first_name": "Alice", "last_name": "Smith", "email": "alice@example.com", "created_at": "…" }`
- `400 Bad Request` — validation failure
- `404 Not Found` — `user_id` does not exist
- `409 Conflict` — credentials already set for this user, or email already registered

**`POST /api/auth/signin`** — Authenticate with email + password

Request body:
```json
{ "email": "alice@example.com", "password": "secret123" }
```

Validation:
- `email`: valid email format
- `password`: 1–128 characters

Responses:
- `200 OK` — `{ "user_id": "…", "first_name": "Alice", "last_name": "Smith", "email": "…", "created_at": "…" }`
- `400 Bad Request` — validation failure
- `401 Unauthorized` — incorrect email or password (bcrypt mismatch or email not found)

---

### User Registration

**`POST /api/users/`** — Create user record (name only)

Request body:
```json
{ "first_name": "Alice", "last_name": "Smith" }
```

Validation:
- Both fields required, 1–80 characters.
- Whitespace collapsed via `" ".join(value.split())`; blank after normalisation is rejected.

Responses:
- `201 Created` — `{ "id": "550e8400-…", "first_name": "Alice", "last_name": "Smith", "age": null, "date_of_birth": null, "country": null, …, "created_at": "…" }`
- `400 Bad Request` — blank or over-length names
- `409 Conflict` — `{ "detail": "A user with this first and last name is already registered." }`

**`GET /api/users/{user_id}`**

Responses:
- `200 OK` — `UserRead` (includes all profile + location fields)
- `404 Not Found`

**`PATCH /api/users/{user_id}`** — Update profile & location fields

Request body:
```json
{
  "first_name": "Alice",
  "last_name": "Jones",
  "age": 29,
  "date_of_birth": "1997-04-12",
  "country": "United States",
  "state_province": "California",
  "city": "San Francisco",
  "house_address": "123 Main St"
}
```

Validation:
- `first_name`, `last_name`: required, 1–80 characters, whitespace-normalised
- `age`: optional, 1–120
- `date_of_birth`: optional, ISO date string
- Location fields: optional, max lengths as per schema

Responses:
- `200 OK` — updated `UserRead`
- `400 Bad Request` — validation failure
- `404 Not Found` — user does not exist
- `409 Conflict` — new name combination already registered by another user

---

### Activity Ingestion

**`POST /api/activities/`**

Request body (running example):
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "sport": "running",
  "distance_km": "5.000",
  "occurred_at": "2026-10-17T09:00:00Z"
}
```

Request body (gym example):
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "sport": "gym",
  "duration_seconds": 3600
}
```

Request body (daily steps example):
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "sport": "daily_steps",
  "steps": 10000
}
```

Validation:
- `sport`: one of `running`, `walking`, `cycling`, `gym`, `swimming`, `daily_steps`
- `user_id`: exactly 36 characters
- Exactly the matching metric must be provided (enforced by Pydantic `model_validator`):
  - `running/walking/cycling` → `distance_km` only (gt=0, max 10 digits, 3 decimal places)
  - `gym/swimming` → `duration_seconds` only (1–86400)
  - `daily_steps` → `steps` only (1–2,000,000)
- `occurred_at`: optional ISO 8601 datetime; defaults to current UTC time if omitted

Responses:
- `201 Created` — `ActivityRead` including backend-calculated `points`
- `400 Bad Request` — wrong metric supplied, metric out of range, or schema error
- `404 Not Found` — `user_id` does not exist

**`GET /api/activities/?user_id={uuid}&limit={n}`**

- `user_id`: required, exactly 36 characters
- `limit`: optional, 1–500, default 100

Responses:
- `200 OK` — `list[ActivityRead]` ordered by `occurred_at DESC`
- `404 Not Found` — user does not exist

---

### Leaderboard

**`GET /api/leaderboard/`**

Response `200 OK`:
```json
[
  {
    "rank": 1,
    "user_id": "550e8400-…",
    "name": "Bob Jones",
    "total_points": 850,
    "consistency_days": 3,
    "rank_change": 2
  }
]
```

`rank_change` is `null` when no challenge window is configured (all-time mode), or when the user had no activity in the previous period.

Ranked by `(-total_points, -consistency_days, normalized_name, user_id)`.

---

### Dashboard

**`GET /api/users/{user_id}/dashboard`**

Response `200 OK`:
```json
{
  "total_points": 1515,
  "activity_count": 3,
  "history": [
    { "date": "2026-10-17", "points": 1515, "activities": 3 }
  ],
  "sport_breakdown": [
    {
      "sport": "running",
      "activities": 1,
      "points": 1000,
      "distance_km": "10.000",
      "duration_minutes": 0,
      "steps": 0
    }
  ]
}
```

**`GET /api/users/{user_id}/coach`**

Response `200 OK`:
```json
{
  "active_days_last_7": 1,
  "message": "You logged activity on 1 day(s) this week…",
  "disclaimer": "General encouragement only; not medical advice."
}
```

---

### Achievements

**`GET /api/users/{user_id}/achievements/`**

Response `200 OK`:
```json
[
  {
    "id": 1,
    "slug": "running_10km",
    "label": "Running — 10 km",
    "unlocked_at": "2026-10-17T09:05:00Z"
  }
]
```

---

### Chatbot

**`POST /api/chat/`**

Request body: `{ "question": "How do I warm up before a run?" }`

Validation: question must be a non-empty string.

Response `200 OK`: `{ "answer": "…" }`

Response `503 Service Unavailable`: API key not configured or Gemini provider error.

---

## d. Scoring & Normalization Logic

Points are calculated once on the backend in `app/services/scoring.py` immediately before the activity row is inserted. The computed value is stored permanently in `activities.points`. Clients never supply or can modify points.

| Sport | Metric accepted | Rate | Flooring rule |
|---|---|---|---|
| Running | distance (km) | 100 pts / km | `floor(distance_km × 100)` |
| Walking | distance (km) | 50 pts / km | `floor(distance_km × 50)` |
| Cycling | distance (km) | 25 pts / km | `floor(distance_km × 25)` |
| Swimming | duration (seconds) | 15 pts / completed minute | `(duration_seconds // 60) × 15` |
| Gym | duration (seconds) | 5 pts / completed minute | `(duration_seconds // 60) × 5` |
| Daily steps | step count | 1 pt / 100 steps | `steps // 100` |

**Distance flooring:** Uses Python `Decimal` with `ROUND_FLOOR` to avoid floating-point artefacts.  
`points = int((distance_km * Decimal("100")).to_integral_value(rounding=ROUND_FLOOR))`  
Example: 1.7 km running = `floor(1.7 × 100)` = 170 pts (not 169 or 171).

**Duration flooring:** Python integer floor division `//` ensures only fully completed minutes count.  
Example: 89 seconds of swimming = `(89 // 60) × 15` = 1 × 15 = **15 pts**.  
Example: 90 seconds of swimming = `(90 // 60) × 15` = 1 × 15 = **15 pts**.  
Example: 120 seconds = `(120 // 60) × 15` = 2 × 15 = **30 pts**.

**Steps flooring:** Integer division `//` at the 100-step block boundary.  
Example: 9,999 steps = `9999 // 100` = **99 pts**.  
Example: 10,000 steps = `10000 // 100` = **100 pts**.

**Validation of sport/metric pairing (two layers):**
1. **Pydantic** `model_validator(mode="after")` in `ActivityCreate` — raises `ValueError` if the wrong metric is supplied, before any DB work.
2. **Database** check constraint `ck_activities_sport_metric_pairing` — secondary defence.

**Milestone thresholds by sport:**

| Sport | Unit | Thresholds | Repeats every |
|-------|------|------------|---------------|
| running | km | 10, 50, 100 | 100 km |
| walking | km | 10, 50, 100 | 100 km |
| cycling | km | 10, 50, 100 | 100 km |
| swimming | min | 60, 300, 600 | 600 min |
| gym | min | 60, 300, 600 | 600 min |
| daily_steps | steps | 10,000 · 50,000 · 100,000 | 100,000 steps |

Badge slugs are machine-stable strings: `{sport}_{value}{unit}` e.g. `"running_100km"`. Labels are human-readable: `"Running — 100 km"`.

---

## e. Frontend Architecture & Visualisations

### Component tree

```
App
├── LoginPage         (sign-in + create-account tabs)
└── Layout            (topbar, achievements sidebar, floating chatbot)
    ├── DashboardPage
    │   ├── StatCard ×4       (total points, active days, activity count, rank)
    │   ├── LineChart          (cumulative points over time — Recharts)
    │   ├── PieChart           (points breakdown by sport — Recharts)
    │   ├── Sport breakdown table
    │   └── Coach panel        (active days + motivational message)
    ├── LeaderboardPage
    │   └── Leaderboard table  (rank, name, points, consistency, rank change)
    ├── ActivitiesPage
    │   └── ActivityHistory    (paginated activity log table)
    └── LogActivityPage
        └── ActivityForm       (sport picker → dynamic metric input → submit)
```

**`RequireAuth`** — guards all non-login routes. If `user` is null in `AuthContext`, redirects to `/login`.

**`AchievementsSidebarContext`** — second React context controlling the slide-in badge notification panel. After `POST /activities/` returns, the frontend fetches `/users/{id}/achievements/`, diffs against the locally stored set, and opens the sidebar to display newly unlocked badges.

### State management

React Context is used for two global state concerns:

- **`AuthContext`** — `user | null`, `login()`, `logout()`, `updateUser()`. On mount, reads `fitness-challenge-user` from `localStorage` to restore the session across page refreshes. On `login()`, the user object is persisted to `localStorage` and set in React state simultaneously.
- **`AchievementsSidebarContext`** — controls sidebar open/close state and the list of badges to display.

No external state library (Redux, Zustand, etc.) is used.

### Charts

**Cumulative line chart (DashboardPage):**  
The `history` array from the dashboard API contains daily point totals indexed by date. The frontend computes a running cumulative sum before passing the data to Recharts `LineChart`. A single-entry history is duplicated so a visible line segment renders instead of an empty chart. Y-axis: "Points"; X-axis: date.

**Points-by-sport pie/doughnut (DashboardPage):**  
Built from the `sport_breakdown` array returned by the dashboard API — no extra request. Each slice represents total points earned in that sport. Sports with 0 points are excluded. Percentage labels render inside slices ≥ 5%; a legend shows sport names.

### Leaderboard ranking strategy

The leaderboard service (`app/services/leaderboard.py`) runs two aggregation queries against the `activities` table:

1. **Points:** `SUM(points) GROUP BY user_id`.
2. **Consistency:** distinct `occurred_at::date` values per user (unique active days).

Sort key: `(-total_points, -consistency_days, normalized_name, user_id)`.

Tie-breaking rules:
- Tied on points → more unique active days wins.
- Tied on both → alphabetical by case-folded name.
- Still tied → lower user UUID (stable, deterministic tiebreaker).

If `CHALLENGE_START` and `CHALLENGE_END` are set in config, both aggregations are filtered to that window. `rank_change` is computed by running the same aggregation over the equal-length period immediately before the current window (`previous_start = challenge_start - period_length`). A positive `rank_change` means the user moved up (improved).

In all-time mode (no dates configured), `rank_change` is `null` for all entries.

---

## f. Trade-offs & Edge Cases

### Concurrent duplicate user registration

The unique constraint `uq_user_normalized_name` is enforced at the database level. Even if two requests pass the application-level name check simultaneously (TOCTOU), the losing `INSERT` raises `IntegrityError`. The route handler catches this and returns HTTP 409. No explicit locking or serialisable transaction is required.

### Concurrent badge awarding

`evaluate_and_award` iterates milestone thresholds and calls `db.flush()` after each `INSERT` (not `commit()`). If two concurrent activity submissions both cross the same milestone, the second flush raises `IntegrityError` on the `uq_achievement_user_slug` unique constraint. The exception is caught per-milestone, `db.rollback()` is called, and the loop continues. The badge is recorded exactly once. The final `db.commit()` only runs if at least one new badge was inserted.

### Concurrent duplicate email registration

The `credentials.email` column has a `UNIQUE` index. Concurrent `POST /auth/create` calls with the same email will result in one succeeding (201) and the other receiving `IntegrityError` → HTTP 409 ("An account with this email already exists").

### Single-activity charts

A user with one logged activity produces a one-point `history` array. The cumulative line chart duplicates the single data point so a line segment renders visibly. The pie chart renders normally with a single full-circle slice.

### Invalid sport/metric combinations

Validated at two layers:
- **Pydantic** `model_validator(mode="after")` in `ActivityCreate` rejects requests where the supplied metric does not match the sport — before any database work is attempted.
- **Database** check constraint `ck_activities_sport_metric_pairing` provides a defence-in-depth second layer.

### Timezone handling

All `occurred_at` values are stored with UTC timezone info. If the frontend submits a naive (timezone-unaware) datetime, the route handler detects `tzinfo is None` and attaches UTC before storage. The API always returns timezone-aware ISO 8601 strings.

### Password security

Passwords are hashed using **bcrypt with 12 work-factor rounds** (`bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12))`). The hash is stored in the `credentials` table. Plaintext passwords are never persisted anywhere on the backend and never logged. Verification uses `bcrypt.checkpw()`, which is timing-safe. The frontend does not store plaintext passwords; `localStorage` only retains the email and user_id for session lookup.

There is no JWT or server-side session token in this implementation. The session is maintained entirely via the user object in `localStorage`. For production, this would be replaced with short-lived signed JWT tokens or HttpOnly session cookies.

### Large activity histories

`get_user_activities` accepts a `limit` parameter (max 500 via the API; the dashboard service fetches up to 5,000 internally). For very active users this remains an in-memory aggregation. A production system would push the `SUM`/`GROUP BY` aggregation to the database, avoiding loading all rows into Python memory.

### Missing Gemini API key

If `GEMINI_API_KEY` is not set in the environment, `ask_chatbot()` raises `RuntimeError` immediately before making any network call. The chat route catches this and returns `HTTP 503 Service Unavailable` with a human-readable error. The rest of the application is unaffected.

### Points immutability

Points are calculated at ingestion time and stored in `activities.points`. They are never recalculated. If the scoring formula changes, historical activities retain their original points — which is intentional for fairness in a time-bounded challenge. A migration would be required to retroactively adjust historic data.

### User ID type (UUID vs. integer)

User IDs are UUID strings (`uuid4()`, stored as 36-char `TEXT`). The `0001_initial` migration used `INTEGER` auto-increment, but the design was evolved to UUIDs to avoid exposing sequential, enumerable IDs in public API responses. All FK columns in `activities` and `achievements` were updated correspondingly. The migration files reflect the historical state; existing data was migrated.
