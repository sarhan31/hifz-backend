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
  async createLog(logData, authHeader, email) {
    const { user_id, surah_number, ayah_start, ayah_end, fluency_score, audio_url } = logData;

    try {
      console.log(`[RecitationService] Saving log for user: ${user_id}, surah: ${surah_number}`);
      
      // Ensure user exists
      await userService.ensureUserExists(user_id, email, undefined, authHeader);

      const { data, error } = await supabase
        .from('recitation_logs')
        .insert([{
          user_id,
          surah_number,
          ayah_start,
          ayah_end,
          fluency_score,
          audio_url,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error(`[RecitationService] Insert Error:`, error.message);
        throw error;
      }

      console.log(`[RecitationService] Log saved successfully.`);
      return data;
    } catch (err) {
      console.error(`[RecitationService] Critical Error:`, err.message);
      throw err;
    }
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
