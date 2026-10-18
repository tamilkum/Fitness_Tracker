# Fitness Challenge

A fitness challenge application built with FastAPI, SQLite/PostgreSQL, React, and TypeScript. Users can log activities, earn points, view a global leaderboard, and track personal activity trends.

## Requirements

- Python 3.10 or later
- Node.js 18 or later and npm

## Backend setup

1. Open a terminal in `backend/`.
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the API:
   ```bash
   uvicorn app.main:app --reload
   ```
5. Open http://localhost:8000/docs to see the API documentation.

The app uses SQLite by default (`fitness_challenge.db` in the `backend/` folder).
To use PostgreSQL instead, copy `.env.example` to `.env` and update `DATABASE_URL`.

## Frontend setup

1. Open a second terminal in `frontend/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the URL printed in the terminal (typically http://localhost:5173).

## Scoring

| Activity     | Rate                              |
|--------------|-----------------------------------|
| Running      | 100 pts per km                    |
| Walking      | 50 pts per km                     |
| Cycling      | 25 pts per km                     |
| Swimming     | 15 pts per completed minute       |
| Gym          | 5 pts per completed minute        |
| Daily steps  | 1 pt per full 100 steps           |

## Ranking

Total points rank users first. If users tie on points, the user with activity on more distinct dates ranks higher.

## Coach card

The activity-aware coach uses recent logged activity to produce general encouragement. It is rule-based and does not provide medical advice.
