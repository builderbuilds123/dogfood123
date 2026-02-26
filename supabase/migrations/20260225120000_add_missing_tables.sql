-- ===================== SHARED SONGS TABLE =====================
CREATE TABLE IF NOT EXISTS public.shared_songs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id uuid NOT NULL REFERENCES public.user_links(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_name text NOT NULL,
  artist_name text NOT NULL,
  artwork_url text,
  track_view_url text,
  preview_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_songs_link_created ON public.shared_songs(link_id, created_at DESC);

ALTER TABLE public.shared_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shared songs for their link" ON public.shared_songs
  FOR SELECT USING (
    link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

CREATE POLICY "Users can insert shared songs for their link" ON public.shared_songs
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

CREATE POLICY "Users can delete own shared songs" ON public.shared_songs
  FOR DELETE USING (
    user_id = auth.uid()
    AND link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_songs;

-- ===================== CALENDAR EVENTS TABLE =====================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id uuid NOT NULL REFERENCES public.user_links(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) <= 200),
  description text CHECK (char_length(description) <= 500),
  event_date date NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('milestone', 'date')),
  emoji text DEFAULT '💕',
  recurring_yearly boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_link_date ON public.calendar_events(link_id, event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_link_type ON public.calendar_events(link_id, event_type);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calendar events for their link" ON public.calendar_events
  FOR SELECT USING (
    link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

CREATE POLICY "Users can insert calendar events for their link" ON public.calendar_events
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

CREATE POLICY "Users can update calendar events for their link" ON public.calendar_events
  FOR UPDATE USING (
    link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

CREATE POLICY "Users can delete own calendar events" ON public.calendar_events
  FOR DELETE USING (
    user_id = auth.uid()
    AND link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
