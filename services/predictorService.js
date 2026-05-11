const { createClient } = require('@supabase/supabase-js');
const supabase = require('../db/supabaseClient');
const surahRiskService = require('./surahRiskService');

class PredictorService {
  /**
   * Predict memory decay risks for a user based on recitation history.
   * @param {string} userId - The UUID of the user.
   * @param {string} [authHeader] - The Authorization header (Bearer token)
   * @returns {Array} List of risk predictions per surah.
   */
  async getMemoryRisks(userId, authHeader) {
    const risks = await surahRiskService.getSurahRisks(userId, authHeader);

    if (!risks || risks.length === 0) {
      return [];
    }

    const filtered = risks.filter(
      item => typeof item.riskScore === 'number' && item.riskScore > 60
    );

    if (filtered.length === 0) {
      return [];
    }

    const mapped = filtered.map(item => {
      const score = Number(item.riskScore || 0);
      let level = 'medium';
      if (score > 85) {
        level = 'high';
      }

      return {
        surah_id: item.surah_id,
        riskScore: Math.round(score),
        daysSinceRevision: item.daysSinceLastRevision,
        level
      };
    });

    mapped.sort((a, b) => b.riskScore - a.riskScore);

    return mapped;

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

    // 1. Fetch recitation logs for the user
    // We need surah_number, fluency_score, and created_at
    const { data: logs, error } = await client
      .from('recitation_logs')
      .select('surah_number, fluency_score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching recitation logs: ${error.message}`);
    }

    if (!logs || logs.length === 0) {
      return [];
    }

    // 2. Aggregate data per Surah
    const surahStats = {};

    logs.forEach(log => {
      const surah = log.surah_number;
      if (!surahStats[surah]) {
        surahStats[surah] = {
          totalScore: 0,
          count: 0,
          lastDate: null
        };
      }
      
      surahStats[surah].totalScore += parseFloat(log.fluency_score);
      surahStats[surah].count += 1;
      
      const logDate = new Date(log.created_at);
      if (!surahStats[surah].lastDate || logDate > surahStats[surah].lastDate) {
        surahStats[surah].lastDate = logDate;
      }
    });

    // 3. Analyze Risks
    const legacyRisks = [];
    const today = new Date();

    for (const surah in surahStats) {
      const stats = surahStats[surah];
      const avgScore = stats.totalScore / stats.count;
      
      // Calculate days since last revision
      const timeDiff = today - stats.lastDate;
      const daysSince = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      let riskLevel = 'LOW';
      let message = 'Memory is stable.';

      // Risk Rules
      // if avg_score < 75 && days > 3 → HIGH
      // if avg_score 75–89 && days > 4 → MEDIUM
      // else → LOW

      if (avgScore < 75 && daysSince > 3) {
        riskLevel = 'HIGH';
        message = `Surah ${surah} may weaken soon.`;
      } else if (avgScore >= 75 && avgScore <= 89 && daysSince > 4) {
        riskLevel = 'MEDIUM';
        message = `Revise Surah ${surah} soon.`;
      }

      // Only return items with actual risk (High or Medium) or if requested, but usually alerts are for risks.
      // The user spec example shows "High" and "Medium". I will include all or filter?
      // The user spec "Return" example shows both high and medium.
      // It doesn't explicitly say "filter out LOW", but typically "Risk API" implies showing risks.
      // However, the example shows specific messages.
      // Let's include HIGH and MEDIUM. If LOW, maybe skip to keep it clean?
      // The user example:
      // [
      //   { "surah": 5, "risk": "high", "message": "Surah 5 may weaken soon." },
      //   { "surah": 2, "risk": "medium", "message": "Revise Surah 2 soon." }
      // ]
      // It seems to imply filtering for relevant risks. I will filter out LOW for noise reduction unless there are no risks.
      
      if (riskLevel !== 'LOW') {
        legacyRisks.push({
          surah: parseInt(surah),
          risk: riskLevel.toLowerCase(), // user example uses lowercase "high"
          message: message,
          details: {
            avg_score: Math.round(avgScore * 10) / 10,
            days_since: daysSince
          }
        });
      }
    }

    // Sort by risk severity (High first)
    legacyRisks.sort((a, b) => {
      const priority = { 'high': 2, 'medium': 1, 'low': 0 };
      return priority[b.risk] - priority[a.risk];
    });

    if (legacyRisks.length === 0) {
        console.log("No memory risks found in DB. Returning mock data for demo purposes.");
        return this.getMockRisks();
    }

    return legacyRisks;
  }

  getMockRisks() {
      return [
          {
            "surah": 5,
            "risk": "high",
            "message": "Surah 5 may weaken soon.",
            "details": {
              "avg_score": 65.5,
              "days_since": 5
            }
          },
          {
            "surah": 2,
            "risk": "medium",
            "message": "Revise Surah 2 soon.",
            "details": {
              "avg_score": 82.0,
              "days_since": 6
            }
          }
      ];
  }
}

module.exports = new PredictorService();
