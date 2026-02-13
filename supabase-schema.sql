-- ============================================
-- Dogfood123 Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================

-- PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  persona TEXT CHECK (persona IN ('doggo', 'princess')),
  display_name TEXT,
  avatar_url TEXT,
  referral_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- USER LINKS TABLE
CREATE TABLE public.user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_pair UNIQUE (user_a, user_b),
  CONSTRAINT no_self_link CHECK (user_a <> user_b)
);

CREATE INDEX idx_user_links_user_a ON public.user_links(user_a);
CREATE INDEX idx_user_links_user_b ON public.user_links(user_b);

-- REFERRALS TABLE
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);

-- MESSAGE STATUS ENUM
CREATE TYPE public.message_status AS ENUM ('sent', 'delivered', 'read');

-- MESSAGES TABLE
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.user_links(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'audio')),
  content TEXT,
  media_url TEXT,
  media_metadata JSONB DEFAULT '{}',
  status public.message_status NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_link_id ON public.messages(link_id, created_at DESC);
CREATE INDEX idx_messages_receiver_status ON public.messages(receiver_id, status);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

-- MOOD CHECKINS TABLE
CREATE TABLE public.mood_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.user_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  note TEXT CHECK (char_length(note) <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mood_checkins_link_created ON public.mood_checkins(link_id, created_at DESC);

-- Enable Realtime for messages, user_links, and mood_checkins
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_checkins;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view linked partner profile"
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT user_b FROM public.user_links WHERE user_a = auth.uid()
      UNION
      SELECT user_a FROM public.user_links WHERE user_b = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- USER_LINKS RLS
ALTER TABLE public.user_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own links"
  ON public.user_links FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can create links"
  ON public.user_links FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- REFERRALS RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Users can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update own referrals"
  ON public.referrals FOR UPDATE
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- MESSAGES RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND link_id IN (
      SELECT id FROM public.user_links
      WHERE user_a = auth.uid() OR user_b = auth.uid()
    )
  );

CREATE POLICY "Receiver can mark messages as read"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- MOOD_CHECKINS RLS
ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own mood checkins"
  ON public.mood_checkins FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND link_id IN (
      SELECT id FROM public.user_links
      WHERE user_a = auth.uid() OR user_b = auth.uid()
    )
  );

CREATE POLICY "Users can view mood checkins for their link"
  ON public.mood_checkins FOR SELECT
  USING (
    link_id IN (
      SELECT id FROM public.user_links
      WHERE user_a = auth.uid() OR user_b = auth.uid()
    )
  );

-- ============================================
-- STORAGE BUCKETS (run in SQL editor or create via dashboard)
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('message-images', 'message-images', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('message-audio', 'message-audio', false);

CREATE POLICY "Auth users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can read images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can upload audio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-audio' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can read audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-audio' AND auth.uid() IS NOT NULL);

-- WISHLIST ITEMS TABLE
CREATE TABLE public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.user_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('dates', 'travel', 'food', 'gifts', 'goals', 'other')),
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_wishlist_items_link ON public.wishlist_items(link_id, category);
CREATE INDEX idx_wishlist_items_created ON public.wishlist_items(link_id, created_at DESC);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wishlist items for their link"
  ON public.wishlist_items FOR SELECT
  USING (link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid()));

CREATE POLICY "Users can insert wishlist items for their link"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id AND link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid()));

CREATE POLICY "Users can update wishlist items for their link"
  ON public.wishlist_items FOR UPDATE
  USING (link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid()));

CREATE POLICY "Users can delete own wishlist items"
  ON public.wishlist_items FOR DELETE
  USING (auth.uid() = user_id AND link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.wishlist_items;

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Streak counter: consecutive days both partners messaged
CREATE OR REPLACE FUNCTION public.get_streak(p_link_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  check_date DATE;
  both_sent BOOLEAN;
BEGIN
  check_date := CURRENT_DATE;

  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.messages
      WHERE link_id = p_link_id AND sender_id = (
        SELECT user_a FROM public.user_links WHERE id = p_link_id
      ) AND created_at::date = check_date
    ) AND EXISTS (
      SELECT 1 FROM public.messages
      WHERE link_id = p_link_id AND sender_id = (
        SELECT user_b FROM public.user_links WHERE id = p_link_id
      ) AND created_at::date = check_date
    ) INTO both_sent;

    IF both_sent THEN
      streak := streak + 1;
      check_date := check_date - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Look up referrer persona by referral code (bypasses RLS for unauthenticated signup)
CREATE OR REPLACE FUNCTION public.get_referrer_persona(ref_code TEXT)
RETURNS TEXT AS $$
  SELECT persona FROM public.profiles WHERE referral_code = ref_code;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Accept a referral: link two users, assign persona (bypasses RLS)
CREATE OR REPLACE FUNCTION public.accept_referral(ref_code TEXT, accepter_id UUID)
RETURNS JSON AS $$
DECLARE
  referrer_record RECORD;
  link_user_a UUID;
  link_user_b UUID;
  new_persona TEXT;
  new_link_id UUID;
BEGIN
  SELECT id, persona INTO referrer_record FROM public.profiles WHERE referral_code = ref_code;
  IF NOT FOUND THEN RETURN json_build_object('error', 'Invalid referral code'); END IF;
  IF referrer_record.id = accepter_id THEN RETURN json_build_object('error', 'Cannot refer yourself'); END IF;
  IF referrer_record.persona IS NULL THEN RETURN json_build_object('error', 'Referrer has no persona'); END IF;
  IF EXISTS (SELECT 1 FROM public.user_links WHERE user_a = accepter_id OR user_b = accepter_id OR user_a = referrer_record.id OR user_b = referrer_record.id) THEN
    RETURN json_build_object('error', 'Already linked');
  END IF;

  new_persona := CASE WHEN referrer_record.persona = 'doggo' THEN 'princess' ELSE 'doggo' END;
  UPDATE public.profiles SET persona = new_persona WHERE id = accepter_id;

  IF accepter_id < referrer_record.id THEN link_user_a := accepter_id; link_user_b := referrer_record.id;
  ELSE link_user_a := referrer_record.id; link_user_b := accepter_id; END IF;

  INSERT INTO public.user_links (user_a, user_b) VALUES (link_user_a, link_user_b) RETURNING id INTO new_link_id;

  UPDATE public.referrals SET referred_user_id = accepter_id, status = 'accepted', accepted_at = now()
    WHERE referral_code = ref_code AND status = 'pending';

  RETURN json_build_object('linked', true, 'link_id', new_link_id, 'partner_id', referrer_record.id, 'persona', new_persona);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== PINGS TABLE =====================
CREATE TABLE IF NOT EXISTS public.pings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id uuid NOT NULL REFERENCES public.user_links(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  seen_at timestamptz
);

CREATE INDEX idx_pings_link_id ON public.pings(link_id);
CREATE INDEX idx_pings_unseen ON public.pings(link_id, sender_id) WHERE seen_at IS NULL;

ALTER TABLE public.pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read pings for their link" ON public.pings
  FOR SELECT USING (
    link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

CREATE POLICY "Users can insert pings for their link" ON public.pings
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

CREATE POLICY "Users can update pings for their link" ON public.pings
  FOR UPDATE USING (
    link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.pings;

-- ===================== DAILY QUESTIONS TABLE =====================
CREATE TABLE IF NOT EXISTS public.daily_questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text text NOT NULL,
  display_date date UNIQUE NOT NULL
);

ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read daily questions" ON public.daily_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ===================== QUESTION ANSWERS TABLE =====================
CREATE TABLE IF NOT EXISTS public.question_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id uuid NOT NULL REFERENCES public.daily_questions(id) ON DELETE CASCADE,
  link_id uuid NOT NULL REFERENCES public.user_links(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(question_id, user_id)
);

CREATE INDEX idx_question_answers_question_link ON public.question_answers(question_id, link_id);

ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read answers for their link" ON public.question_answers
  FOR SELECT USING (
    link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

CREATE POLICY "Users can insert answers for their link" ON public.question_answers
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.question_answers;

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

CREATE INDEX idx_shared_songs_link_created ON public.shared_songs(link_id, created_at DESC);

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

CREATE INDEX idx_calendar_events_link_date ON public.calendar_events(link_id, event_date);
CREATE INDEX idx_calendar_events_link_type ON public.calendar_events(link_id, event_type);

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

-- ===================== WEEKLY RECAPS TABLE =====================
CREATE TABLE IF NOT EXISTS public.weekly_recaps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id uuid NOT NULL REFERENCES public.user_links(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(link_id, week_start)
);

CREATE INDEX idx_weekly_recaps_link_week ON public.weekly_recaps(link_id, week_start DESC);

ALTER TABLE public.weekly_recaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weekly recaps for their link" ON public.weekly_recaps
  FOR SELECT USING (
    link_id IN (SELECT id FROM public.user_links WHERE user_a = auth.uid() OR user_b = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_recaps;

-- Generate weekly recap RPC function
CREATE OR REPLACE FUNCTION public.generate_weekly_recap(p_link_id UUID, p_week_start DATE DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  ws DATE;
  we DATE;
  recap_stats JSONB;
  msg_count INTEGER;
  mood_emojis TEXT[];
  ping_count INTEGER;
  wishlist_done INTEGER;
  q_answered INTEGER;
  photo_count INTEGER;
  song_count INTEGER;
  event_count INTEGER;
  streak_val INTEGER;
  existing_id UUID;
BEGIN
  -- Default to most recent completed week (last Monday to last Sunday)
  IF p_week_start IS NULL THEN
    ws := CURRENT_DATE - (extract(isodow FROM CURRENT_DATE)::int - 1) - 7;
  ELSE
    ws := p_week_start;
  END IF;
  we := ws + 6;

  -- Check if recap already exists
  SELECT id INTO existing_id FROM public.weekly_recaps
    WHERE link_id = p_link_id AND week_start = ws;
  IF existing_id IS NOT NULL THEN
    RETURN json_build_object('exists', true, 'id', existing_id);
  END IF;

  -- Messages count
  SELECT COUNT(*) INTO msg_count FROM public.messages
    WHERE link_id = p_link_id AND created_at::date BETWEEN ws AND we;

  -- Unique mood emojis
  SELECT COALESCE(ARRAY_AGG(DISTINCT emoji), ARRAY[]::TEXT[]) INTO mood_emojis FROM public.mood_checkins
    WHERE link_id = p_link_id AND created_at::date BETWEEN ws AND we;

  -- Pings sent
  SELECT COUNT(*) INTO ping_count FROM public.pings
    WHERE link_id = p_link_id AND created_at::date BETWEEN ws AND we;

  -- Wishlist items completed
  SELECT COUNT(*) INTO wishlist_done FROM public.wishlist_items
    WHERE link_id = p_link_id AND completed = true
    AND completed_at IS NOT NULL AND completed_at::date BETWEEN ws AND we;

  -- Questions answered
  SELECT COUNT(DISTINCT qa.question_id) INTO q_answered
    FROM public.question_answers qa
    WHERE qa.link_id = p_link_id AND qa.created_at::date BETWEEN ws AND we;

  -- Photos shared
  SELECT COUNT(*) INTO photo_count FROM public.messages
    WHERE link_id = p_link_id AND message_type = 'image'
    AND created_at::date BETWEEN ws AND we;

  -- Songs shared
  SELECT COUNT(*) INTO song_count FROM public.shared_songs
    WHERE link_id = p_link_id AND created_at::date BETWEEN ws AND we;

  -- Calendar events added
  SELECT COUNT(*) INTO event_count FROM public.calendar_events
    WHERE link_id = p_link_id AND created_at::date BETWEEN ws AND we;

  -- Current streak
  SELECT public.get_streak(p_link_id) INTO streak_val;

  recap_stats := jsonb_build_object(
    'messages_count', msg_count,
    'moods_used', COALESCE(to_jsonb(mood_emojis), '[]'::jsonb),
    'streak', streak_val,
    'pings_sent', ping_count,
    'wishlist_completed', wishlist_done,
    'questions_answered', q_answered,
    'photos_shared', photo_count,
    'songs_shared', song_count,
    'events_added', event_count
  );

  -- Insert the recap
  INSERT INTO public.weekly_recaps (link_id, week_start, week_end, stats)
  VALUES (p_link_id, ws, we, recap_stats);

  RETURN json_build_object('generated', true, 'week_start', ws, 'week_end', we, 'stats', recap_stats);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
