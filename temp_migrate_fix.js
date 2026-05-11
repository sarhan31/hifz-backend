const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  try {
    const sql = `
      ALTER TABLE recitation_sessions ADD COLUMN IF NOT EXISTS fluency_score INTEGER;
      ALTER TABLE recitation_sessions ADD COLUMN IF NOT EXISTS ayah_range TEXT;
      ALTER TABLE recitation_sessions ADD COLUMN IF NOT EXISTS pronunciation_issues JSONB;
    `;
    const { error } = await supabase.rpc('exec', { sql });
    if (error) {
      console.error('Migration failed:', error);
    } else {
      console.log('Migration successful!');
    }
  } catch (err) {
    console.error('Migration script error:', err);
  }
}

migrate();
