const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDB() {
  console.log("Testing Supabase Connection...");
  console.log("URL:", process.env.SUPABASE_URL);
  
  try {
    // 1. Test users table
    const { data: users, error: userError } = await supabase.from('users').select('id, email').limit(10);
    if (userError) console.error("Users table error:", userError.message);
    else {
        console.log("Users table OK. Found:", users.length);
        console.log("Existing User IDs:", users.map(u => u.id));
    }

    // 2. Test recitation_logs table
    const { data: logs, error: logsError } = await supabase.from('recitation_logs').select('*').limit(1);
    if (logsError) console.error("recitation_logs table error:", logsError.message);
    else console.log("recitation_logs table OK. Found:", logs.length);

    // 3. Test recitation_sessions table
    const { data: sessions, error: sessionsError } = await supabase.from('recitation_sessions').select('*').limit(1);
    if (sessionsError) console.error("recitation_sessions table error:", sessionsError.message);
    else console.log("recitation_sessions table OK. Found:", sessions.length);

    // 4. Test column existence in recitation_logs
    const { data: logCols, error: logColError } = await supabase.from('recitation_logs').insert([{
        user_id: '00000000-0000-0000-0000-000000000000',
        surah_number: 1,
        fluency_score: 0
    }]).select();
    
    if (logColError) {
        console.log("Insert test failed (expected if RLS or schema issue):", logColError.message);
    } else {
        console.log("Insert test successful.");
        // Clean up
        await supabase.from('recitation_logs').delete().eq('user_id', '00000000-0000-0000-0000-000000000000');
    }

  } catch (err) {
    console.error("Critical error during test:", err.message);
  }
}

testDB();
