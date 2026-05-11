const { createClient } = require('@supabase/supabase-js');
const defaultSupabase = require('../db/supabaseClient');

class UserService {
  /**
   * Ensures that a user exists in the public.users table.
   * If not, it creates a placeholder record.
   * Uses the service role key via default supabase client.
   * @param {string} userId - The UUID of the user
   * @param {string} [email] - Optional email
   * @param {string} [name] - Optional name
   * @param {string} [authHeader] - Optional Authorization header (Bearer token)
   */
  async ensureUserExists(userId, email = 'placeholder@example.com', name = 'New User', authHeader = null) {
    let supabase = defaultSupabase;

    // Check if we have the Service Role Key to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceRoleKey) {
      // Explicitly create a client with the Service Role Key to ensure we have admin privileges
      supabase = createClient(
        process.env.SUPABASE_URL,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
    } else if (authHeader) {
      // Fallback: If no Service Role Key, try using the user's token
      // Note: This often fails if RLS prohibits users from inserting into public.users
      supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );
    }

    // Check if user exists
    const { data: userExists, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (userCheckError) {
        console.error("Error checking user existence:", userCheckError);
        // Don't throw, try to insert anyway if it's just a fetch error, or handle gracefully
    }

    if (!userExists) {
      console.log(`User ${userId} missing in public.users. Creating...`);
      const { error: createUserError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email: email,
          name: name
        }]);

      if (createUserError) {
        // Ignore duplicate key error in case of race condition
        if (!createUserError.message.includes('duplicate key') && !createUserError.message.includes('23505')) {
          console.error("Error creating user in public table:", createUserError);
          // We don't throw here to allow the caller to attempt their operation, 
          // though it will likely fail with FK constraint if this failed.
        } else {
            console.log("User creation race condition handled (duplicate key).");
        }
      } else {
          console.log(`User ${userId} created successfully in public.users.`);
      }
    }
  }
}

module.exports = new UserService();
