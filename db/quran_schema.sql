-- Create surahs table
CREATE TABLE IF NOT EXISTS public.surahs (
  id INTEGER PRIMARY KEY, -- Surah number (1-114)
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  total_ayahs INTEGER NOT NULL
);

-- Create ayahs table
CREATE TABLE IF NOT EXISTS public.ayahs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  surah_id INTEGER REFERENCES public.surahs(id) ON DELETE CASCADE,
  ayah_number INTEGER NOT NULL,
  text_ar TEXT NOT NULL,
  UNIQUE(surah_id, ayah_number) -- Ensure unique ayah per surah
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.surahs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ayahs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access for everyone
CREATE POLICY "Allow public read access on surahs" ON public.surahs
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on ayahs" ON public.ayahs
  FOR SELECT USING (true);

-- Create policy to allow insert/update only for service role (optional, but good practice)
-- For now, we might need to allow authenticated users or just rely on service role key in script
