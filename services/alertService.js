const { createClient } = require('@supabase/supabase-js');
const supabase = require('../db/supabaseClient');
const surahRiskService = require('./surahRiskService');

class AlertService {
  /**
   * Generate revision alerts for a user based on days since revision.
   * @param {string} userId - The UUID of the user
   * @param {string} [authHeader] - The Authorization header (Bearer token)
   * @returns {Array} List of revision alerts
   */
  async getAlerts(userId, authHeader) {
    const risks = await surahRiskService.getSurahRisks(userId, authHeader);

    if (!risks || risks.length === 0) {
      return [];
    }

    const filtered = risks.filter(
      item =>
        typeof item.daysSinceLastRevision === 'number' &&
        item.daysSinceLastRevision > 3
    );

    if (filtered.length === 0) {
      return [];
    }

    const mapped = filtered
      .map(item => ({
        surah_id: item.surah_id,
        daysSinceRevision: item.daysSinceLastRevision,
        riskScore: Math.round(Number(item.riskScore || 0))
      }))
      .sort((a, b) => b.daysSinceRevision - a.daysSinceRevision);

    return mapped;
  }
}

module.exports = new AlertService();
