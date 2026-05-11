-- Run this in your Supabase SQL Editor to create the missing table for Memory Anchors

-- 1. Create the table
create table if not exists public.word_mistakes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  surah_id int not null check (surah_id between 1 and 114),
  ayah_number int not null,
  word_text text not null,
  mistake_count int not null default 1,
  last_mistake_date date not null default current_date,
  unique(user_id, surah_id, ayah_number, word_text)
);

-- 2. Enable RLS
alter table public.word_mistakes enable row level security;

-- 3. Create policies
create policy "Users can view own word mistakes" on public.word_mistakes for select using (auth.uid() = user_id);
create policy "Users can insert own word mistakes" on public.word_mistakes for insert with check (auth.uid() = user_id);
create policy "Users can update own word mistakes" on public.word_mistakes for update using (auth.uid() = user_id);
