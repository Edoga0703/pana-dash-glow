
-- profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Agente',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- chat_assignments
CREATE TABLE public.chat_assignments (
  contact_id TEXT NOT NULL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_assignments TO authenticated;
GRANT ALL ON public.chat_assignments TO service_role;
ALTER TABLE public.chat_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read assignments" ON public.chat_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can upsert assignments" ON public.chat_assignments FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "Authenticated can update assignments" ON public.chat_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (auth.uid() = agent_id);
CREATE POLICY "Authenticated can delete assignments" ON public.chat_assignments FOR DELETE TO authenticated USING (true);

-- sent_messages
CREATE TABLE public.sent_messages (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id TEXT NOT NULL,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sent_messages_contact_idx ON public.sent_messages(contact_id, sent_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sent_messages TO authenticated;
GRANT ALL ON public.sent_messages TO service_role;
ALTER TABLE public.sent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read sent_messages" ON public.sent_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert own sent_messages" ON public.sent_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_chat_assignments_updated_at BEFORE UPDATE ON public.chat_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'Agente'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage policies for agent-avatars (private bucket, signed URLs)
CREATE POLICY "Authenticated can read avatars" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'agent-avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'agent-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'agent-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'agent-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
