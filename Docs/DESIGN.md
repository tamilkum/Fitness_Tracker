# Fitness Challenge — Design Document

## a. System Architecture & Data Flow

### High-level architecture

```
Browser (React + TypeScript)
        │  JSON over HTTP
        ▼
FastAPI (Python)
  ├─ Pydantic validation
  ├─ Service layer  (scoring, leaderboard, dashboard, achievements, chatbot)
  ├─ Repository layer (SQLAlchemy ORM)
  └─ SQLite database  (fitness_challenge.db)
```

The frontend is a single-page React application served by Vite on `localhost:5173`.
The backend is a FastAPI application served by Uvicorn on `localhost:8000`.
CORS is configured to allow requests from the frontend origin.

### Registration data flow

1. User fills in the "Create account" form (name, age, DOB, location, email, password).
2. The frontend calls `POST /api/users/` with `{ first_name, last_name }`.
3. The backend normalises whitespace and case-folds the names, checks the unique constraint, and either creates the user (201) or returns 409 if the normalised name pair already exists.
4. On success, the frontend stores the full extended profile (age, location, email, password) in `localStorage` under `fitness-challenge-accounts`, keyed by email. The backend only ever receives `first_name` and `last_name`.
5. The stored `user_id` is used for all subsequent API calls.

### Activity ingestion data flow

1. User submits the "Log an activity" form (sport + matching metric).
2. The frontend calls `POST /api/activities/` with `{ user_id, sport, distance_km | duration_seconds | steps, occurred_at? }`.
3. The backend validates the sport/metric pairing and calculates `points` using the scoring service.
4. The activity row is inserted; `evaluate_and_award` then checks whether any milestone badges have been newly reached and inserts them into the `achievements` table.
5. The response returns the full `ActivityRead` object including the backend-calculated `points`.

---

## b. Database Schema & Data Model

### `users` table

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | Primary key, auto-increment |
| `first_name` | VARCHAR(80) | Not null |
| `last_name` | VARCHAR(80) | Not null |
| `normalized_first_name` | VARCHAR(80) | Not null |
| `normalized_last_name` | VARCHAR(80) | Not null |
| `created_at` | DATETIME(tz) | Not null, server default now() |

**Duplicate enforcement:** A `UNIQUE` constraint named `uq_user_normalized_name` covers `(normalized_first_name, normalized_last_name)`. Before insert, the backend case-folds both names (Python `.casefold()`) and collapses whitespace (`" ".join(value.split())`). Any concurrent race that passes the application-level check still fails at the database level, which raises `IntegrityError` → HTTP 409.

### `activities` table

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | Primary key, auto-increment |
| `user_id` | INTEGER | FK → `users.id` CASCADE DELETE |
| `sport` | VARCHAR(20) | Not null, indexed |
| `distance_km` | NUMERIC(10,3) | Nullable |
| `duration_seconds` | INTEGER | Nullable |
| `steps` | INTEGER | Nullable |
| `points` | INTEGER | Not null, ≥ 0 |
| `occurred_at` | DATETIME(tz) | Not null, indexed |
| `created_at` | DATETIME(tz) | Not null, server default now() |

**Check constraints:**
- `ck_activities_sport_metric_pairing` — distance sports use `distance_km`; duration sports use `duration_seconds`; daily steps use `steps`. Exactly one column is non-null for any row.
- `ck_activities_metric_ranges` — distance > 0; duration 1–86400 s; steps 1–2,000,000.
- `ck_activities_points_nonnegative` — `points ≥ 0`.

**Index:** `ix_activities_user_occurred_at` on `(user_id, occurred_at)` accelerates per-user timeline queries.

### `achievements` table

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | Primary key, auto-increment |
| `user_id` | INTEGER | FK → `users.id` CASCADE DELETE, indexed |
| `slug` | VARCHAR(64) | Not null |
| `unlocked_at` | DATETIME(tz) | Not null, server default now() |

**Uniqueness:** `UNIQUE(user_id, slug)` named `uq_achievement_user_slug` prevents the same badge being awarded twice to the same user. The award service uses `db.flush()` to detect the constraint early; a concurrent insert that wins the race raises `IntegrityError` which is caught and silently skipped.

---

## c. API Specifications

All routes are prefixed `/api`.

### User registration

**`POST /api/users/`**

Request body:
```json
{ "first_name": "Alice", "last_name": "Smith" }
```

Validation:
- Both fields required, 1–80 characters.
- Whitespace normalised; cannot be blank after normalisation.

Responses:
- `201 Created` — `{ "id": 1, "first_name": "Alice", "last_name": "Smith", "created_at": "…" }`
- `400 Bad Request` — schema validation failure (blank names, too long).
- `409 Conflict` — `{ "detail": "A user with this first and last name is already registered." }`

**`GET /api/users/{user_id}`**

Responses:
- `200 OK` — `UserRead`
- `404 Not Found`

**`PATCH /api/users/{user_id}`**

Request body:
```json
{ "first_name": "Alice", "last_name": "Jones" }
```

Responses:
- `200 OK` — updated `UserRead`
- `404 Not Found`
- `409 Conflict` — new name combination already registered

### Activity ingestion

**`POST /api/activities/`**

Request body (running example):
```json
{
  "user_id": 1,
  "sport": "running",
  "distance_km": "5.000",
  "occurred_at": "2026-10-17T09:00:00Z"
}
```

Validation:
- `sport` must be one of `running`, `walking`, `cycling`, `gym`, `swimming`, `daily_steps`.
- Exactly the matching metric must be provided (distance for distance sports, duration for gym/swimming, steps for daily_steps).
- `occurred_at` is optional; defaults to current UTC time.

Responses:
- `201 Created` — `ActivityRead` including `points`
- `400 Bad Request` — wrong metric supplied or schema error
- `404 Not Found` — user does not exist

**`GET /api/activities/?user_id={id}&limit={n}`**

- `user_id`: required, integer > 0
- `limit`: optional, 1–500, default 100

Responses:
- `200 OK` — `list[ActivityRead]` ordered by `occurred_at DESC`
- `404 Not Found`

### Leaderboard

**`GET /api/leaderboard/`**

Response `200 OK`:
```json
[
  { "rank": 1, "user_id": 2, "name": "Bob Jones", "total_points": 850,
    "consistency_days": 3, "rank_change": null }
]
```

Ranked by `(-total_points, -consistency_days, normalized_name, user_id)`.

### Dashboard

**`GET /api/users/{user_id}/dashboard`**

Response `200 OK`:
```json
{
  "total_points": 1515,
  "activity_count": 3,
  "history": [{ "date": "2026-10-17", "points": 1515, "activities": 3 }],
  "sport_breakdown": [
    { "sport": "running", "activities": 1, "points": 1000, "distance_km": "10.000", "duration_minutes": 0, "steps": 0 }
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

### Achievements

**`GET /api/users/{user_id}/achievements/`**

Response `200 OK`:
```json
[
  { "id": 1, "slug": "running_10km", "label": "Running — 10 km", "unlocked_at": "…" }
]
```

### Chatbot

**`POST /api/chat/`**

Request body: `{ "question": "How do I warm up before a run?" }`

Validation: 1–1000 characters.

Response `200 OK`: `{ "answer": "…" }`

Response `503 Service Unavailable`: API key not configured or Gemini provider error.

---

## d. Scoring & Normalization Logic

Points are calculated once on the backend in `app/services/scoring.py` and stored with the activity record. Clients never supply or modify points.

| Sport | Metric | Rate | Flooring rule |
|---|---|---|---|
| Running | distance (km) | 100 pts / km | `floor(distance_km × 100)` |
| Walking | distance (km) | 50 pts / km | `floor(distance_km × 50)` |
| Cycling | distance (km) | 25 pts / km | `floor(distance_km × 25)` |
| Swimming | duration (seconds) | 15 pts / completed minute | `(duration_seconds // 60) × 15` |
| Gym | duration (seconds) | 5 pts / completed minute | `(duration_seconds // 60) × 5` |
| Daily steps | step count | 1 pt / 100 steps | `steps // 100` |

**Distance flooring:** Decimal multiplication uses Python `Decimal` with `ROUND_FLOOR` to avoid floating-point artefacts. Example: 1.7 km running = `floor(1.7 × 100)` = 170 pts (not 169 or 171).

**Duration flooring:** Integer division `//` ensures only fully completed minutes count. Example: 89 seconds of swimming = `(89 // 60) × 15` = 1 × 15 = 15 pts.

**Steps flooring:** Integer division `//`. Example: 9,999 steps = `9999 // 100` = 99 pts.

---

## e. Frontend Architecture & Visualisations

### Component tree

```
App
├── LoginPage         (sign-in + create-account tabs)
└── Layout            (topbar, awards sidebar, floating chatbot)
    ├── DashboardPage
    │   ├── Dashboard
    │   │   ├── StatCard ×4  (points, active days, activities, rank)
    │   │   ├── LineChart    (cumulative points over time)
    │   │   ├── PieChart     (points by sport)
    │   │   ├── Sport breakdown table
    │   │   └── Coach panel
    │   ├── AchievementToast
    │   └── SetTargetModal
    ├── LeaderboardPage → Leaderboard
    ├── ActivitiesPage → ActivityHistory
    └── LogActivityPage → ActivityForm
```

### Charts

**Cumulative line chart:** The `history` array from the dashboard API contains daily point totals. The frontend converts these to a running cumulative series before rendering with Recharts `LineChart`. A single-date entry is duplicated to avoid rendering an invisible point. Axes are labelled "Points" (Y) and date (X).

**Points-by-sport pie/doughnut:** Built from the `sport_breakdown` array already returned by the dashboard API — no extra fetch. Slices represent **total points per sport**, a single homogeneous unit. Sports with zero points are excluded. Percentage labels are rendered inside slices ≥ 5%; the legend shows sport name.

### Leaderboard ranking strategy

The leaderboard service (`app/services/leaderboard.py`) runs two aggregation queries against the `activities` table:

1. **Points:** `SUM(points)` grouped by `user_id`.
2. **Consistency:** distinct `occurred_at::date` values per user.

Sort key: `(-total_points, -consistency_days, normalized_name, user_id)`.

Tie on points → more active days wins. Tie on both → alphabetical by case-folded name → lower user ID (stable, deterministic).

If `CHALLENGE_START` and `CHALLENGE_END` are configured, both aggregations are filtered to that window. `rank_change` is computed by running the same aggregation over the equal-length period immediately before the current window.

---

## f. Trade-offs & Edge Cases

### Concurrent duplicate registration

The unique constraint `uq_user_normalized_name` is enforced at the database level. Even if two requests pass the application-level check simultaneously, the losing INSERT raises `IntegrityError`, which the route handler converts to HTTP 409. No explicit locking is needed.

### Concurrent badge awarding

`evaluate_and_award` iterates milestone thresholds, calls `db.flush()` after each INSERT, and catches `Exception` (covers `IntegrityError`). If two concurrent activity submissions both cross the same milestone, the second flush raises `IntegrityError`; the exception is caught, a rollback is issued, and the loop continues. The badge ends up recorded exactly once.

### Single-activity charts

A user with one logged activity produces a one-point history. The cumulative line chart duplicates the point so the line segment renders visibly rather than as an empty chart. The pie chart renders normally with a single full-circle slice.

### Invalid sport/metric combinations

Validated at two layers:
- **Pydantic** (`model_validator` in `ActivityCreate`) rejects requests where the supplied metric does not match the sport before any database work.
- **Database** check constraint `ck_activities_sport_metric_pairing` provides a second line of defence.

### Timezone handling

All `occurred_at` values are stored with UTC timezone. The frontend may submit a naive datetime; the route handler detects `tzinfo is None` and attaches UTC before storage. The API returns timezone-aware ISO 8601 strings.

### Password storage

The current implementation stores passwords in browser `localStorage` as part of the frontend-only credential store. There is no auth backend — the backend never receives or stores passwords. This is a known limitation suitable for a demo/challenge context. In production, passwords must be hashed server-side (e.g. bcrypt via `passlib`) and a real session/token mechanism added.

### Large activity histories

`get_user_activities` accepts a `limit` parameter (max 500 via the API; the dashboard service uses 5000 internally). For very active users this remains an in-memory aggregation. A production system would push aggregation to the database with a `GROUP BY` query.
