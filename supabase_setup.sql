-- ==============================================================================
-- ALL-IN-ONE PHOTOTOR SUPABASE SETUP & ADMIN CREATION SCRIPT
-- Execute this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create 'profiles' table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_pro BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. Create 'app_settings' table for dynamic Admin Config
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Insert default app settings
INSERT INTO public.app_settings (key, value)
VALUES (
  'adsterra_config',
  '{"adsterra_enabled": true, "export_countdown_seconds": 15, "adsterra_300x250_key": "adsterra_300x250_key", "adsterra_728x90_key": "adsterra_728x90_key"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for 'profiles'
DROP POLICY IF EXISTS "Public profiles reading" ON public.profiles;
CREATE POLICY "Public profiles reading" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Profile updating policy" ON public.profiles;
CREATE POLICY "Profile updating policy" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Profile deletion policy" ON public.profiles;
CREATE POLICY "Profile deletion policy" ON public.profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. RLS Policies for 'app_settings'
DROP POLICY IF EXISTS "Public app_settings reading" ON public.app_settings;
CREATE POLICY "Public app_settings reading" ON public.app_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin app_settings modification" ON public.app_settings;
CREATE POLICY "Admin app_settings modification" ON public.app_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. Trigger to automatically create profile row when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, is_pro)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user',
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Retroactively sync existing registered users into profiles table
INSERT INTO public.profiles (id, email, full_name, role, is_pro)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1)), 'user', false
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 9. Make admin@phototor.com Admin & Pro Member!
UPDATE public.profiles SET role = 'admin', is_pro = true WHERE email = 'admin@phototor.com';
