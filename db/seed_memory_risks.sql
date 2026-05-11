-- INSERT OLD RECITATION LOGS TO TRIGGER MEMORY RISKS
-- Run this in Supabase SQL Editor

-- User ID: 25b900a3-7fbc-4427-9b04-3a136eac0ff3

-- 1. High Risk Scenario (Low Score + Old Date)
-- Surah 5: Score 65, Last recited 5 days ago
insert into public.recitation_logs (user_id, surah_number, ayah_start, ayah_end, fluency_score, created_at)
values 
('25b900a3-7fbc-4427-9b04-3a136eac0ff3', 5, 1, 10, 65.0, now() - interval '5 days');

-- 2. Medium Risk Scenario (Medium Score + Old Date)
-- Surah 2: Score 80, Last recited 6 days ago
insert into public.recitation_logs (user_id, surah_number, ayah_start, ayah_end, fluency_score, created_at)
values 
('25b900a3-7fbc-4427-9b04-3a136eac0ff3', 2, 1, 10, 80.0, now() - interval '6 days');

-- 3. Low Risk (Recent + High Score) - Should NOT show up
-- Surah 1: Score 95, Last recited 1 day ago
insert into public.recitation_logs (user_id, surah_number, ayah_start, ayah_end, fluency_score, created_at)
values 
('25b900a3-7fbc-4427-9b04-3a136eac0ff3', 1, 1, 7, 95.0, now() - interval '1 day');
