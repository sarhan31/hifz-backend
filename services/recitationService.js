const { createClient } = require('@supabase/supabase-js');
const supabase = require('../db/supabaseClient');
const userService = require('./userService');
const disciplineService = require('./disciplineService');

class RecitationService {
  /**
   * Save a new recitation log
   * @param {Object} logData - The log data to save
   * @param {string} [authHeader] - The Authorization header (Bearer token)
   * @returns {Object} The saved log entry
   */
  async createLog(logData, authHeader) {
    const { user_id, surah_number, ayah_start, ayah_end, fluency_score, audio_url } = logData;

    // Ensure user exists in public.users before inserting log
    // Pass authHeader to allow RLS bypass if service key is missing
    await userService.ensureUserExists(user_id, undefined, undefined, authHeader);

    // Record discipline activity
    try {
      await disciplineService.recordActivity(user_id, authHeader);
    } catch (err) {
      console.error("Failed to record discipline activity in RecitationService:", err);
    }

    const client = supabase;

    const { data, error } = await client
      .from('recitation_logs')
      .insert([{
        user_id,
        surah_number,
        ayah_start,
        ayah_end,
        fluency_score,
        audio_url, // Add audio_url
        created_at: new Date()
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Error saving log: ${error.message}`);
    }

    return data;
  }

  /**
   * Fetch the last 5 recitation logs for a user
   * @param {string} userId - The UUID of the user
   * @param {string} [authHeader] - The Authorization header (Bearer token)
   * @returns {Array} List of logs
   */
  async getLogs(userId, authHeader) {
    const client = supabase;

    const { data, error } = await client
      .from('recitation_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      throw new Error(`Error fetching logs: ${error.message}`);
    }

    return data;
  }

  /**
   * Fetch all recitation logs for stats calculation
   * @param {string} userId - The UUID of the user
   * @param {string} [authHeader] - The Authorization header (Bearer token)
   * @returns {Array} List of logs (surah_number, fluency_score)
   */
  async getAllLogsForStats(userId, authHeader) {
    const client = supabase;

    const { data, error } = await client
      .from('recitation_logs')
      .select('surah_number, fluency_score')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Error fetching logs for stats: ${error.message}`);
    }

    return data;
  }
}

module.exports = new RecitationService();
