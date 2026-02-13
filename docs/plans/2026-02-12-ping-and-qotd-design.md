# Thinking of You Ping + Question of the Day — Design

## Feature 1: "Thinking of You" Ping

### Database
- `pings` table: `id` (uuid), `link_id` (FK), `sender_id` (FK), `created_at`, `seen_at` (nullable timestamp)
- RLS: both linked partners can read; only authenticated user can insert as sender

### API
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ping` | POST | Insert a ping |
| `/api/ping/unseen` | GET | Count unseen pings (sender ≠ me, seen_at IS NULL) |
| `/api/ping/seen` | PATCH | Mark all unseen pings as seen |

### UI — Sending
- Floating 💓 button, top-left (`fixed top-4 left-4 z-30`), mirrors ⚙️ gear on right
- Single tap sends ping — button does quick scale bounce as confirmation
- 5-second cooldown after sending (button dims)

### UI — Receiving
- On BlackholeScene mount: fetch unseen count via `/api/ping/unseen`
- If count > 0: rapid heartbeat pulse sequence (one pulse per ping, ~400ms apart)
  - Each pulse: blackhole glows warm pink/red, scales up, returns
  - After all pulses: floating "💓 ×N" counter fades out after 2s
  - Then PATCH `/api/ping/seen` to mark seen
- Realtime subscription on `pings` table filtered by `link_id`
  - Live ping while online → play single pulse immediately

---

## Feature 2: "Question of the Day"

### Database
- `daily_questions` table: `id` (uuid), `question_text`, `display_date` (date, unique)
  - Seeded with ~50 starter questions; cycles if exhausted
- `question_answers` table: `id` (uuid), `question_id` (FK), `link_id` (FK), `user_id` (FK), `answer_text`, `created_at`
  - Unique constraint on (question_id, user_id) — one answer per person per question

### API
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/questions/today` | GET | Today's question + both answers for user's link |
| `/api/questions/answer` | POST | Submit answer for today's question |

### UI — Button & Drawer
- Floating ❓ button, top-left below 💓 (`fixed top-16 left-4 z-30`)
- Orange dot badge if user hasn't answered today
- Bottom-sheet drawer (same pattern as wishlist/photos)

### UI — Drawer Contents
- **Top:** Today's question in large text
- **Your answer:** Text input + submit. After submit, shows as static text
- **Partner's answer:** Blurred/hidden until you submit → then fades in. If partner hasn't answered: "Waiting for [partner]..."
- **History:** Scrollable past Q&As below (most recent first), both answers visible

### Realtime
- Subscribe to `question_answers` filtered by `link_id`
- Partner's answer appears live after you've already answered
