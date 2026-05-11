-- Add missing columns to recitation_sessions
ALTER TABLE recitation_sessions ADD COLUMN IF NOT EXISTS fluency_score INTEGER;
ALTER TABLE recitation_sessions ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0;
ALTER TABLE recitation_sessions ADD COLUMN IF NOT EXISTS ayah_range TEXT;
ALTER TABLE recitation_sessions ADD COLUMN IF NOT EXISTS pronunciation_issues JSONB DEFAULT '[]'::jsonb;
