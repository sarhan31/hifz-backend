const { createClient } = require('@supabase/supabase-js');
const supabase = require('../db/supabaseClient');

class SurahStabilityService {
  async getStability(userId, authHeader) {
    const client = supabase;

    let data;
    try {
      const result = await client
        .from('recitation_sessions')
        .select('surah_id, accuracy, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (result.error) {
        console.error('Error fetching recitation sessions for stability:', result.error.message);
        return [];
      }
      data = result.data;
    } catch (err) {
      console.error('Error fetching recitation sessions for stability:', err.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const bySurah = new Map();
    for (const row of data) {
      const key = row.surah_id;
      if (!bySurah.has(key)) {
        bySurah.set(key, []);
      }
      bySurah.get(key).push(row);
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const result = [];

    for (const [surahId, sessions] of bySurah.entries()) {
      const recent = sessions.slice(0, 5);

      const accuracies = recent
        .map(s => Number(s.accuracy))
        .filter(a => !Number.isNaN(a));

      let variance = 0;
      if (accuracies.length > 1) {
        const mean = accuracies.reduce((sum, v) => sum + v, 0) / accuracies.length;
        const varSum = accuracies.reduce((sum, v) => {
          const diff = v - mean;
          return sum + diff * diff;
        }, 0);
        variance = varSum / accuracies.length;
      }

      const sessionsLast14Days = sessions.filter(s => {
        const createdAt = new Date(s.created_at);
        return createdAt >= cutoff;
      }).length;

      const stability = this.classifyStability(variance, sessionsLast14Days);

      result.push({
        surah_id: surahId,
        variance: Math.round(variance),
        sessions_last_14_days: sessionsLast14Days,
        stability
      });
    }

    return result;
  }

  classifyStability(variance, sessionsLast14Days) {
    if (!sessionsLast14Days || sessionsLast14Days === 0) {
      return 'Unstable';
    }

    if (variance <= 20) {
      return 'Stable';
    }

    if (variance <= 80) {
      return 'Fluctuating';
    }

    return 'Unstable';
  }
}

module.exports = new SurahStabilityService();
