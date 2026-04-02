
-- Profiles table for auth user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add user_id to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN user_id UUID;

-- Update RLS on user_profiles
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.user_profiles;

CREATE POLICY "Users can insert own style profiles" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own style profiles" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);

-- Add user_id to generated_outfits
ALTER TABLE public.generated_outfits ADD COLUMN user_id UUID;

-- Update RLS on generated_outfits
DROP POLICY IF EXISTS "Anyone can insert outfits" ON public.generated_outfits;
DROP POLICY IF EXISTS "Anyone can view outfits" ON public.generated_outfits;
DROP POLICY IF EXISTS "Anyone can update outfits" ON public.generated_outfits;

CREATE POLICY "Users can insert own outfits" ON public.generated_outfits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own outfits" ON public.generated_outfits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own outfits" ON public.generated_outfits FOR UPDATE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
