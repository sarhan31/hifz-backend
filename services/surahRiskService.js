const { createClient } = require('@supabase/supabase-js');
const supabase = require('../db/supabaseClient');
const strengthService = require('./strengthService');
const surahStabilityService = require('./surahStabilityService');

class SurahRiskService {
  async getSurahRisks(userId, authHeader) {
    let client = supabase;
    if (authHeader) {
      client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        global: {
          headers: { Authorization: authHeader }
        }
      });
    }

    const [confidenceList, stabilityList, sessionsResult] = await Promise.all([
      strengthService.getConfidenceScores(userId, authHeader),
      surahStabilityService.getStability(userId, authHeader),
      client
        .from('recitation_sessions')
        .select('surah_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(res => {
          if (res.error) throw res.error;
          return res;
        })
        .catch(err => {
          console.error('Error fetching sessions for risk service:', err.message);
          return { data: [] };
        })
    ]);

    const sessions = sessionsResult && sessionsResult.data ? sessionsResult.data : sessionsResult?.data === undefined ? sessionsResult : sessionsResult;

    if (!confidenceList || confidenceList.length === 0 || !sessions || sessions.length === 0) {
      return [];
    }

    const lastSessionBySurah = {};
    sessions.forEach(session => {
      const surahId = session.surah_id;
      if (!lastSessionBySurah[surahId]) {
        lastSessionBySurah[surahId] = new Date(session.created_at);
        return;
      }
      const existing = lastSessionBySurah[surahId];
      const current = new Date(session.created_at);
      if (current > existing) {
        lastSessionBySurah[surahId] = current;
      }
    });

    const stabilityBySurah = new Map();
    (stabilityList || []).forEach(item => {
      stabilityBySurah.set(item.surah_id, item.stability);
    });

    const today = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;

    const risks = [];

    confidenceList.forEach(entry => {
      const surahId = entry.surah_id;
      const confidence = typeof entry.confidence === 'number' ? entry.confidence : 0;
      const lastDate = lastSessionBySurah[surahId];

      if (!lastDate) {
        return;
      }

      const daysSince = Math.max(
        0,
        Math.floor((today.getTime() - lastDate.getTime()) / msPerDay)
      );

      const stability = stabilityBySurah.get(surahId) || 'Unknown';
      const stabilityWeight = this.getStabilityWeight(stability);

      const riskScore =
        2 * daysSince +
        (100 - confidence) +
        stabilityWeight;

      const classification = this.classifyRisk(riskScore);

      risks.push({
        surah_id: surahId,
        riskScore: Math.round(riskScore),
        classification,
        daysSinceLastRevision: daysSince
      });
    });

    risks.sort((a, b) => b.riskScore - a.riskScore);

    return risks;
  }

  getStabilityWeight(stability) {
    if (!stability) return 0;
    switch (stability) {
      case 'Stable':
        return 0;
      case 'Fluctuating':
        return 10;
      case 'Unstable':
        return 20;
      default:
        return 5;
    }
  }

  classifyRisk(score) {
    if (score >= 80) {
      return 'High Risk';
    }
    if (score >= 50) {
      return 'Moderate Risk';
    }
    if (score >= 25) {
      return 'Low Risk';
    }
    return 'Safe';
  }
}

module.exports = new SurahRiskService();

