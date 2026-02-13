# Photo Drops, Shared Wishlist & Streak Counter Design

## Feature 1: Photo Drops

Photos sent through blackhole animation + browsable gallery page.

- Camera button + drag-and-drop in ChatInterface
- Upload to existing `message-images` storage bucket
- Insert as message with `message_type: 'image'`
- Thumbnail rendering in blackhole animations
- `/photos` gallery page with masonry grid + lightbox

No new tables — reuses `messages` table.

## Feature 2: Shared Wishlist

Categorized checklist at `/wishlist`.

- Categories: dates, travel, food, gifts, goals, other
- Category tabs + scrollable item list + floating add button
- Real-time sync via Supabase Realtime

New table: `wishlist_items` (id, link_id, user_id, title, category, completed, completed_by, created_at, completed_at)

API: POST/PATCH/DELETE at `/api/wishlist`

## Feature 3: Streak Counter

Consecutive days where both partners messaged. Displayed in blackhole center.

- Computed via `get_streak` RPC function
- Visual intensity scales: 0 (hidden), 1-7 (dim), 8-30 (glow), 31+ (neon)
- Affects BlackholeVortex glow + BlackholeParticles count

No new tables — computed from `messages`.
