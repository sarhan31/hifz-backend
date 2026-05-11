-- SETUP TEACHER DASHBOARD DATA & POLICIES
-- Run this script in the Supabase SQL Editor to enable the Teacher Dashboard functionality.

-- 1. Fix Permissions (RLS) for Students Table
-- Allow the backend (anon key) to read student data.
-- WARNING: This policy allows anyone with the Anon Key to read student names.
-- For production, use Service Role Key in backend instead.
drop policy if exists "Teachers can view their students" on public.students;
create policy "Allow public read students" on public.students
for select using (true);

-- 2. Insert Demo Teacher User (if not exists)
-- Using the hardcoded ID from the frontend: 25b900a3-7fbc-4427-9b04-3a136eac0ff3
insert into auth.users (id, email)
values ('25b900a3-7fbc-4427-9b04-3a136eac0ff3', 'teacher@huffaz.com')
on conflict (id) do nothing;

insert into public.users (id, name, email, level)
values ('25b900a3-7fbc-4427-9b04-3a136eac0ff3', 'Ustad Abdullah', 'teacher@huffaz.com', 'Hafiz')
on conflict (id) do nothing;

-- 3. Insert Demo Students
insert into public.students (name, email, teacher_id)
values 
('Ahmed Ali', 'ahmed@example.com', '25b900a3-7fbc-4427-9b04-3a136eac0ff3'),
('Fatima Hassan', 'fatima@example.com', '25b900a3-7fbc-4427-9b04-3a136eac0ff3'),
('Yusuf Khan', 'yusuf@example.com', '25b900a3-7fbc-4427-9b04-3a136eac0ff3')
on conflict (email) do nothing;

-- 4. Verify Data
select * from public.students where teacher_id = '25b900a3-7fbc-4427-9b04-3a136eac0ff3';
