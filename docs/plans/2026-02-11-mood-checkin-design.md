# Mood Check-in Feature Design

## Summary

Mutual mood check-in: either partner can share their current mood (emoji + optional note) at any time. The partner sees it instantly via a floating orb on the blackhole screen. No history view for MVP — just the latest mood from each partner.

## Decisions

- **Trigger**: On-demand (either partner, any time)
- **Input**: Emoji from curated 3x4 grid + optional short note (max 100 chars)
- **Reveal**: Instant share — partner sees it in real-time as soon as submitted
- **Placement**: Floating pill/orb in the status bar area of the blackhole screen; bottom sheet picker

## The Mood Orb

A small floating pill in the top-right of the blackhole status bar:
- Shows partner's latest mood emoji + time ago (e.g., `🥰 2h ago`)
- If no mood submitted: pulsing `💭` with "check in?"
- Tapping opens the mood picker bottom sheet
- After submitting: shows both moods side by side (`🥰 · 😴`)
- Soft glow color matching emoji energy; gentle breathing scale animation
- Pop animation on partner's screen when new mood arrives

## The Bottom Sheet Picker

Slides up over blackhole with backdrop blur:
- 3x4 emoji grid:
  - 😊 Happy | 🥰 Loved | 😤 Frustrated | 😢 Sad
  - 😴 Tired | 🤗 Grateful | 😰 Anxious | 🤒 Sick
  - 🔥 Excited | 😌 Calm | 😐 Meh | 🫠 Overwhelmed
- Selected emoji gets neon-violet ring highlight
- Optional single-line note input ("add a note..." placeholder)
- "Send check-in" button
- Dismiss on submit or tap outside

## Database

```sql
CREATE TABLE mood_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES user_links(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  emoji TEXT NOT NULL,
  note TEXT CHECK (char_length(note) <= 100),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mood_checkins_link_created ON mood_checkins(link_id, created_at DESC);
```

RLS: users can insert own check-ins, read check-ins for their link.

## API Routes

- `POST /api/mood/checkin` — Insert mood. Body: `{ emoji, note? }`
- `GET /api/mood/latest` — Latest check-in per partner (2 rows max)

## Real-time

Add INSERT listener on `mood_checkins` table to existing Realtime channel (filtered by link_id).

## New Files

- `components/mood/MoodOrb.tsx`
- `components/mood/MoodPicker.tsx`
- `components/mood/MoodEmoji.tsx`
- `app/api/mood/checkin/route.ts`
- `app/api/mood/latest/route.ts`

## Modified Files

- `app/(app)/blackhole/page.tsx` — fetch latest moods server-side
- `components/blackhole/BlackholeScene.tsx` — add MoodOrb, manage mood state
- `lib/hooks/useRealtime.ts` — add mood_checkins INSERT listener
- `lib/types/index.ts` — add MoodCheckin type
- `lib/types/database.ts` — add mood_checkins table type
- `supabase-schema.sql` — add table + RLS
