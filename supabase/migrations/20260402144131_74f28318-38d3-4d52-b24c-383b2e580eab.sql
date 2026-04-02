
-- User profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gender TEXT NOT NULL,
  height TEXT,
  body_type TEXT NOT NULL,
  skin_tone TEXT,
  hairstyle TEXT,
  occasion TEXT NOT NULL,
  user_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view profiles" ON public.user_profiles FOR SELECT USING (true);

-- Generated outfits table
CREATE TABLE public.generated_outfits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  outfit_name TEXT NOT NULL,
  occasion TEXT NOT NULL,
  colors TEXT[] DEFAULT '{}',
  items JSONB NOT NULL DEFAULT '[]',
  try_on_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert outfits" ON public.generated_outfits FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view outfits" ON public.generated_outfits FOR SELECT USING (true);
CREATE POLICY "Anyone can update outfits" ON public.generated_outfits FOR UPDATE USING (true);
