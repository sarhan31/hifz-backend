require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'add_missing_columns.sql'), 'utf8');
  
  // Split SQL by semicolon and run each command
  const commands = sql.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
  
  for (const command of commands) {
    console.log(`Executing: ${command}`);
    const { error } = await supabase.rpc('exec_sql', { sql_query: command });
    if (error) {
      // If exec_sql doesn't exist, we might need another way.
      // Supabase doesn't expose a raw SQL endpoint via the client normally unless enabled.
      // But we can try the REST API if we have the service role key.
      console.error(`Error executing command: ${error.message}`);
      
      // Alternative: Try to use the REST API directly
      try {
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({ sql_query: command })
        });
        if (!response.ok) {
          const errText = await response.text();
          console.error(`REST API error: ${errText}`);
        } else {
          console.log(`Success via REST API`);
        }
      } catch (e) {
        console.error(`REST API fetch failed: ${e.message}`);
      }
    } else {
      console.log('Success');
    }
  }
}

migrate();
