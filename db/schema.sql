-- Enable UUID extension for generating unique IDs
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE
-- This table extends the default Supabase auth.users table.
-- It stores additional profile information.
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  email text unique not null,
  level text check (level in ('Beginner', 'Intermediate', 'Hafiz')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. SURAH STRENGTH TABLE
-- Tracks the user's memorization strength for each Surah.
create table public.surah_strength (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  surah_number int not null check (surah_number between 1 and 114),
  strength_level text check (strength_level in ('Weak', 'Medium', 'Strong')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, surah_number) -- One record per surah per user
);

-- 3. RECITATION LOGS TABLE
-- Logs every recitation session for history and analytics.
create table public.recitation_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  surah_number int not null,
  ayah_start int,
  ayah_end int,
  fluency_score numeric(5, 2),
  audio_url text,
  created_at timestamptz default now()
);

create table public.recitation_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  surah_id int not null,
  accuracy int,
  mistake_count int,
  duration_seconds int,
  words_per_minute int,
  created_at timestamptz default now()
);

create table public.word_mistakes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  surah_id int not null check (surah_id between 1 and 114),
  ayah_number int not null,
  word_text text not null,
  mistake_count int not null default 1,
  last_mistake_date date not null default current_date,
  unique(user_id, surah_id, ayah_number, word_text)
);

-- 4. TAJWEED ISSUES TABLE
-- specific mistakes identified during a recitation.
create table public.tajweed_issues (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  rule_type text, -- e.g., 'Ghunnah', 'Madd'
  occurrences int default 1,
  created_at timestamptz default now()
);

-- 5. REVISION PLAN TABLE
-- Scheduled tasks for the user.
create table public.revision_plan (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null default current_date,
  sabaq jsonb, -- Storing Sabaq details (e.g., { surah: 1, start: 1, end: 5 })
  sabaqi jsonb, -- Storing Sabaqi details
  manzil jsonb, -- Storing Manzil details
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. STUDENTS TABLE
-- Links students to teachers.
create table public.students (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text unique not null,
  teacher_id uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables to ensure users only access their own data.

alter table public.users enable row level security;
alter table public.surah_strength enable row level security;
alter table public.recitation_logs enable row level security;
alter table public.recitation_sessions enable row level security;
alter table public.word_mistakes enable row level security;
alter table public.tajweed_issues enable row level security;
alter table public.revision_plan enable row level security;
alter table public.students enable row level security;

-- Policies for Users
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- Policies for Surah Strength
create policy "Users can view own strength" on public.surah_strength for select using (auth.uid() = user_id);
create policy "Users can insert own strength" on public.surah_strength for insert with check (auth.uid() = user_id);
create policy "Users can update own strength" on public.surah_strength for update using (auth.uid() = user_id);

-- Policies for Recitation Logs
create policy "Users can view own logs" on public.recitation_logs for select using (auth.uid() = user_id);
create policy "Users can insert own logs" on public.recitation_logs for insert with check (auth.uid() = user_id);

create policy "Users can view own sessions" on public.recitation_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on public.recitation_sessions for insert with check (auth.uid() = user_id);

create policy "Users can view own word mistakes" on public.word_mistakes for select using (auth.uid() = user_id);
create policy "Users can insert own word mistakes" on public.word_mistakes for insert with check (auth.uid() = user_id);
create policy "Users can update own word mistakes" on public.word_mistakes for update using (auth.uid() = user_id);

-- Policies for Tajweed Issues
create policy "Users can view own issues" on public.tajweed_issues for select using (auth.uid() = user_id);
create policy "Users can insert own issues" on public.tajweed_issues for insert with check (auth.uid() = user_id);

-- Policies for Revision Plan
create policy "Users can view own plan" on public.revision_plan for select using (auth.uid() = user_id);
create policy "Users can insert own plan" on public.revision_plan for insert with check (auth.uid() = user_id);
create policy "Users can update own plan" on public.revision_plan for update using (auth.uid() = user_id);

-- Policies for Students
-- Allow teachers to view their students
create policy "Teachers can view their students" on public.students for select using (auth.uid() = teacher_id);
