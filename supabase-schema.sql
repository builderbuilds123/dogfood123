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

-- Enable Realtime for messages and user_links
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_links;

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

-- ============================================
-- RPC FUNCTIONS
-- ============================================

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
