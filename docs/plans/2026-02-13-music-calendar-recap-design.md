# Shared Music, Shared Calendar, Weekly Recap

Date: 2026-02-13
Status: Implemented

## Features

### 1. Shared Music
- Song search via iTunes Search API (free, no auth)
- Server-side proxy at `/api/music/search` with 5-minute cache
- Floating MusicPill in status bar showing latest shared song
- MusicDrawer with debounced search, share button, song history
- Apple Music link on each song
- Real-time sync via Supabase Realtime

### 2. Shared Calendar
- Two event types: milestones (past) and planned dates (future)
- CalendarDrawer with "Upcoming" and "Milestones" tabs
- Countdown badge on trigger button for upcoming events within 30 days
- Inline add form with date picker, type toggle, emoji selector
- Recurring yearly support for anniversaries
- Real-time sync

### 3. Weekly Recap
- Auto-generated stats for the past week (Mon-Sun)
- Lazy generation via `generate_weekly_recap` RPC on first access
- Aggregates: messages, moods, streak, pings, wishlist, questions, photos, songs, calendar events
- RecapDrawer with gradient-bordered stat cards and past recap history
- Sunday notification banner

## Database Tables
- `shared_songs` - Song sharing history
- `calendar_events` - Milestones and planned dates
- `weekly_recaps` - Aggregated weekly stats (JSONB)

## Layout
```
Top-left:      [Ping]     [MusicPill] [msg count] [MoodOrb] [Settings]
               [Question]

Center:        [Blackhole + Streak]

Bottom-left:   [Recap]              [Calendar]  :Bottom-right
               [Photos]             [Wishlist]

Bottom-center: [ChatInterface]
```
