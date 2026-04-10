# focus-app

A personal productivity Mac app — todo list, Pomodoro timer, notes, and Claude as your accountability coach.

## Stack

- **Electron** — desktop shell (menu bar tray, global shortcut)
- **React** — UI (loaded via CDN in Phase 1, webpack in later phases)
- **SQLite** (`better-sqlite3`) — local data (Phase 2)
- **Claude API** (Anthropic) — coaching, prioritization, summarization (Phase 5+)

## Running locally

```bash
npm install
npm start
```

Requires Node.js 18+.

## Environment

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+Shift+F` | Quick capture (task or note) |

## Build phases

- [x] Phase 1 — Electron + React scaffold, tray icon, quick capture
- [ ] Phase 2 — SQLite schema + real todo CRUD
- [ ] Phase 3 — Global quick-capture shortcut persists to DB
- [ ] Phase 4 — Pomodoro timer with manual check-ins
- [ ] Phase 5 — Claude API layer + prompt templates
- [ ] Phase 6 — Morning kickoff flow
- [ ] Phase 7 — Drift detection
- [ ] Phase 8 — Notes view + Claude summarization
- [ ] Phase 9 — End-of-day review
- [ ] Phase 10 — Message drafting (email, Slack)
- [ ] Phase 11 — Notifications (idle nudges, reminders)
- [ ] Phase 12 — Habits tracking (deferred post-MVP)

## Data model (Phase 2+)

```
tasks          — id, title, status, priority, due_date, carried_over_count
notes          — id, task_id, content, summary, created_at
focus_sessions — id, task_id, started_at, ended_at, duration_minutes, reflection
daily_plans    — id, date, task_ids, claude_advice, review_notes
messages       — id, context, role, content, timestamp
```
