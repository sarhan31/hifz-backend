-- Fix RLS Policy for Recitation Logs
-- Run this in your Supabase SQL Editor to allow the backend to save logs without user authentication tokens.

-- 1. Drop the existing strict policy for inserting logs
drop policy if exists "Users can insert own logs" on public.recitation_logs;

-- 2. Create a new policy that allows inserts without auth check
-- This allows the backend (using Anon Key) to insert logs for any user_id.
create policy "Allow backend insert logs" on public.recitation_logs
for insert with check (true);

-- 3. Update select policy to allow viewing logs (optional, if dashboard has issues)
drop policy if exists "Users can view own logs" on public.recitation_logs;
create policy "Allow view all logs" on public.recitation_logs
for select using (true);
