
-- 7. BOOKMARKS TABLE
-- Supports both automatic session bookmarks and manual user bookmarks.
create table if not exists public.bookmarks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  juz_number int check (juz_number between 1 and 30),
  surah_id int check (surah_id between 1 and 114),
  ayah_number int,
  word_index int default 0,
  type text check (type in ('session', 'manual')) not null,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for faster lookup of user bookmarks
create index if not exists bookmarks_user_id_idx on public.bookmarks(user_id);
create index if not exists bookmarks_type_idx on public.bookmarks(type);

-- Enable RLS
alter table public.bookmarks enable row level security;

-- Policies for Bookmarks
create policy "Users can view own bookmarks" on public.bookmarks 
  for select using (auth.uid() = user_id);

create policy "Users can insert own bookmarks" on public.bookmarks 
  for insert with check (auth.uid() = user_id);

create policy "Users can update own bookmarks" on public.bookmarks 
  for update using (auth.uid() = user_id);

create policy "Users can delete own bookmarks" on public.bookmarks 
  for delete using (auth.uid() = user_id);
