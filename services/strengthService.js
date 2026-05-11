const { createClient } = require('@supabase/supabase-js');
const supabase = require('../db/supabaseClient');

class StrengthService {
  async getStrengthAnalysis(userId, authHeader) {
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

    let sessions;
    try {
      const result = await client
        .from('recitation_sessions')
        .select('surah_id, accuracy, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (result.error) throw result.error;
      sessions = result.data;
    } catch (err) {
      console.error(`Error fetching sessions for strength analysis: ${err.message}`);
      return [];
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    const surahGroups = {};
    sessions.forEach(session => {
      if (session.accuracy === null || session.accuracy === undefined) {
        return;
      }

      const surah = session.surah_id;
      if (!surahGroups[surah]) {
        surahGroups[surah] = [];
      }

      if (surahGroups[surah].length < 5) {
        surahGroups[surah].push(Number(session.accuracy));
      }
    });

    const analysis = Object.keys(surahGroups).map(surah => {
      const scores = surahGroups[surah];
      if (!scores.length) {
        return null;
      }

      const sum = scores.reduce((a, b) => a + b, 0);
      const avg = sum / scores.length;
      const roundedAvg = Math.round(avg);

      let strength = 'weak';
      if (roundedAvg >= 90) strength = 'strong';
      else if (roundedAvg >= 75) strength = 'medium';

      const surahNumber = parseInt(surah, 10);

      return {
        surah: surahNumber,
        avg_score: roundedAvg,
        strength,
        surah_id: surahNumber,
        average_accuracy: roundedAvg
      };
    }).filter(Boolean);

    analysis.sort((a, b) => a.surah - b.surah);

    return analysis;
  }

  async getConfidenceScores(userId, authHeader) {
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

    let sessions;
    try {
      const result = await client
        .from('recitation_sessions')
        .select('surah_id, accuracy, mistake_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (result.error) throw result.error;
      sessions = result.data;
    } catch (err) {
      console.error(`Error fetching sessions for confidence analysis: ${err.message}`);
      return [];
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    const surahGroups = {};

    sessions.forEach(session => {
      if (session.accuracy === null || session.accuracy === undefined) {
        return;
      }

      const surah = session.surah_id;
      if (!surahGroups[surah]) {
        surahGroups[surah] = [];
      }

      if (surahGroups[surah].length < 5) {
        surahGroups[surah].push({
          accuracy: Number(session.accuracy),
          mistake_count: session.mistake_count != null ? Number(session.mistake_count) : 0,
          created_at: session.created_at
        });
      }
    });

    const results = Object.keys(surahGroups).map(surah => {
      const entries = surahGroups[surah];
      if (!entries.length) {
        return null;
      }

      const accuracies = entries.map(e => e.accuracy);
      const mistakes = entries.map(e => e.mistake_count);

      const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
      const avgMistakes = mistakes.reduce((a, b) => a + b, 0) / mistakes.length;

      const orderedByTime = [...entries].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );

      const firstAcc = orderedByTime[0].accuracy;
      const lastAcc = orderedByTime[orderedByTime.length - 1].accuracy;
      const diff = lastAcc - firstAcc;

      let trend = 'stable';
      if (diff > 3) {
        trend = 'increasing';
      } else if (diff < -3) {
        trend = 'decreasing';
      }

      const declinePenalty = trend === 'decreasing' ? 10 : 0;

      let confidence = avgAccuracy - avgMistakes * 2 - declinePenalty;

      if (confidence < 0) confidence = 0;
      if (confidence > 100) confidence = 100;

      const surahId = parseInt(surah, 10);

      return {
        surah_id: surahId,
        confidence: Math.round(confidence),
        trend,
        change: Math.round(diff)
      };
    }).filter(Boolean);

    results.sort((a, b) => a.surah_id - b.surah_id);

    return results;
  }

  async getDeclineAlerts(userId, authHeader) {
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

    const { data: sessions, error } = await client
      .from('recitation_sessions')
      .select('surah_id, accuracy, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching sessions for decline alerts: ${error.message}`);
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    const surahGroups = {};

    sessions.forEach(session => {
      if (session.accuracy === null || session.accuracy === undefined) {
        return;
      }

      const surah = session.surah_id;
      if (!surahGroups[surah]) {
        surahGroups[surah] = [];
      }

      if (surahGroups[surah].length < 4) {
        surahGroups[surah].push({
          accuracy: Number(session.accuracy),
          created_at: session.created_at
        });
      }
    });

    const alerts = Object.keys(surahGroups).map(surah => {
      const entries = surahGroups[surah];

      if (entries.length < 4) {
        return null;
      }

      const orderedByTime = [...entries].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );

      const previousTwo = orderedByTime.slice(0, 2).map(e => e.accuracy);
      const recentTwo = orderedByTime.slice(2, 4).map(e => e.accuracy);

      const previousAvg =
        previousTwo.reduce((a, b) => a + b, 0) / previousTwo.length;
      const recentAvg =
        recentTwo.reduce((a, b) => a + b, 0) / recentTwo.length;

      const drop = previousAvg - recentAvg;

      if (drop >= 10) {
        return {
          surah_id: parseInt(surah, 10),
          drop_percentage: Math.round(drop)
        };
      }

      return null;
    }).filter(Boolean);

    alerts.sort((a, b) => a.surah_id - b.surah_id);

    return alerts;
  }
}

module.exports = new StrengthService();
