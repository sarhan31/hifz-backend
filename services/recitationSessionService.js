const { createClient } = require('@supabase/supabase-js');
const supabase = require('../db/supabaseClient');
const userService = require('./userService');
const disciplineService = require('./disciplineService');

class RecitationSessionService {
  async createSession(sessionData, authHeader) {
    const { user_id } = sessionData;

    await userService.ensureUserExists(user_id, undefined, undefined, authHeader);

    // Record discipline activity (Hifz Test)
    try {
      await disciplineService.recordActivity(user_id, authHeader);
    } catch (err) {
      console.error("Failed to record discipline activity:", err);
      // Don't fail the session creation
    }

    let client = supabase;
    if (authHeader) {
      client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );
    }

    const insertData = {
      user_id: sessionData.user_id,
      surah_id: sessionData.surah_id,
      accuracy: sessionData.accuracy,
      mistake_count: sessionData.mistake_count,
      duration_seconds: sessionData.duration_seconds,
      words_per_minute: sessionData.words_per_minute
      // Let the database handle created_at to avoid timezone issues
    };

    console.log(`Saving recitation session for user ${sessionData.user_id}, surah ${sessionData.surah_id}`);

    // Add optional columns only if they are likely to exist
    if (sessionData.fluency_score !== undefined) insertData.fluency_score = sessionData.fluency_score;
    if (sessionData.pause_count !== undefined) insertData.pause_count = sessionData.pause_count;
    if (sessionData.ayah_range !== undefined) insertData.ayah_range = sessionData.ayah_range;
    if (sessionData.pronunciation_issues !== undefined) insertData.pronunciation_issues = sessionData.pronunciation_issues || [];

    const { data, error } = await client
      .from('recitation_sessions')
      .insert([insertData])
      .select(); // Remove .single() to be safer

    if (error) {
      console.error(`Primary insert failed for user ${sessionData.user_id}:`, error.message);
      
      // Fallback: Try inserting only guaranteed columns
      const fallbackData = {
        user_id: sessionData.user_id,
        surah_id: sessionData.surah_id,
        accuracy: sessionData.accuracy,
        mistake_count: sessionData.mistake_count,
        duration_seconds: sessionData.duration_seconds,
        words_per_minute: sessionData.words_per_minute
      };

      const { data: fallbackRes, error: fallbackError } = await client
        .from('recitation_sessions')
        .insert([fallbackData])
        .select();

      if (fallbackError) {
        console.error(`Fallback insert also failed for user ${sessionData.user_id}:`, fallbackError.message);
        throw new Error(`Error saving recitation session (fallback also failed): ${fallbackError.message}`);
      }
      console.log(`Recitation session saved via fallback for user ${sessionData.user_id}`);
      return fallbackRes[0];
    }

    console.log(`Recitation session saved successfully for user ${sessionData.user_id}`);
    return data[0];
  }

  async getWeeklySummary(userId, authHeader) {
    let client = supabase;
    if (authHeader) {
      client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );
    }

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
    let client = supabase;
    if (authHeader) {
      client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );
    }

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
