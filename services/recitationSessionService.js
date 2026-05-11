const { createClient } = require('@supabase/supabase-js');
const supabase = require('../db/supabaseClient');
const userService = require('./userService');
const disciplineService = require('./disciplineService');

class RecitationSessionService {
  async createSession(sessionData, authHeader, email) {
    const { user_id, surah_id } = sessionData;

    try {
      console.log(`[SessionService] Saving session for user: ${user_id}, surah: ${surah_id}`);
      
      await userService.ensureUserExists(user_id, email, undefined, authHeader);

      const insertData = {
        user_id,
        surah_id,
        accuracy: sessionData.accuracy || 0,
        mistake_count: sessionData.mistake_count || 0,
        duration_seconds: sessionData.duration_seconds || 0,
        words_per_minute: sessionData.words_per_minute || 0,
        created_at: new Date().toISOString()
      };

      if (sessionData.fluency_score !== undefined) insertData.fluency_score = sessionData.fluency_score;

      const { data, error } = await supabase
        .from('recitation_sessions')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error(`[SessionService] Insert Error:`, error.message);
        // Fallback attempt
        const fallbackData = { user_id, surah_id, accuracy: sessionData.accuracy || 0 };
        const { data: fbData, error: fbError } = await supabase.from('recitation_sessions').insert([fallbackData]).select().single();
        if (fbError) throw fbError;
        return fbData;
      }

      console.log(`[SessionService] Session saved successfully.`);
      return data;
    } catch (err) {
      console.error(`[SessionService] Critical Error:`, err.message);
      throw err;
    }
  }

  async getWeeklySummary(userId, authHeader) {
    const client = supabase;

    // Use a more generous date range to avoid timezone issues
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days to be safe

    const { data, error } = await client
      .from('recitation_sessions')
      .select('*') // Get all columns to be safe
      .eq('user_id', userId)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Error fetching weekly recitation sessions: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        currentHealth: null,
        lastWeekHealth: null,
        sessionsLast7Days: [],
        sessionsPrev7Days: []
      };
    }

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last7Days = [];
    const prev7Days = [];

    data.forEach(session => {
      const createdAt = new Date(session.created_at);
      if (createdAt >= sevenDaysAgo) {
        last7Days.push(session);
      } else if (createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo) {
        prev7Days.push(session);
      }
    });

    // Calculate Health scores
    const calculateHealth = (sessions) => {
      if (!sessions || sessions.length === 0) return null;
      
      const avgAccuracy = sessions.reduce((sum, s) => sum + (Number(s.accuracy) || 0), 0) / sessions.length;
      const frequencyFactor = Math.min(100, (sessions.length / 7) * 100);
      
      // Health = 70% accuracy + 30% frequency
      return Math.round((avgAccuracy * 0.7) + (frequencyFactor * 0.3));
    };

    const currentHealth = calculateHealth(last7Days);
    const lastWeekHealth = calculateHealth(prev7Days);

    return {
      currentHealth,
      lastWeekHealth,
      sessionsLast7Days: last7Days,
      sessionsPrev7Days: prev7Days
    };
  }

  async getTodaySummary(userId, authHeader) {
    const client = supabase;

    // Robust "Today" calculation: use 24 hours ago instead of start of day to be timezone-agnostic
    // Also, query WITHOUT the gte filter first to see if there are ANY sessions, for debugging
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data, error } = await client
      .from('recitation_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching today's summary for user ${userId}:`, error.message);
      throw new Error(`Error fetching today's summary: ${error.message}`);
    }

    if (!data || data.length === 0) {
      // DEBUG: Check if there are ANY sessions at all for this user
      const { count } = await client
        .from('recitation_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      console.log(`No sessions in last 24h for user ${userId}. Total user sessions: ${count || 0}`);
      
      return {
        sessions_completed: 0,
        avg_accuracy: 0,
        avg_fluency: 0
      };
    }

    const totalAccuracy = data.reduce((sum, s) => sum + (Number(s.accuracy) || 0), 0);
    const totalFluency = data.reduce((sum, s) => sum + (Number(s.fluency_score) || 0), 0);

    return {
      sessions_completed: data.length,
      avg_accuracy: Math.round(totalAccuracy / data.length),
      avg_fluency: Math.round(totalFluency / data.length)
    };
  }
}

module.exports = new RecitationSessionService();
