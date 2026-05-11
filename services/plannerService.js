const { createClient } = require('@supabase/supabase-js');
const defaultSupabase = require('../db/supabaseClient');
const userService = require('./userService');
const strengthService = require('./strengthService');
const surahRiskService = require('./surahRiskService');
const surahStabilityService = require('./surahStabilityService');

class PlannerService {
  /**
   * Generates a smart revision plan based on user's surah strengths.
   * @param {string} userId - The UUID of the user
   * @param {string} [authHeader] - The Authorization header (Bearer token)
   * @returns {Object} The created revision plan
   */
  async generatePlan(userId, authHeader) {
    const supabase = defaultSupabase;

    // 0. Ensure user exists in public.users (Workaround for missing trigger)
    await userService.ensureUserExists(userId, undefined, undefined, authHeader);

    const [strengths, confidenceList, riskList, stabilityList] = await Promise.all([
      strengthService.getStrengthAnalysis(userId, authHeader),
      strengthService.getConfidenceScores(userId, authHeader),
      surahRiskService.getSurahRisks(userId, authHeader),
      surahStabilityService.getStability(userId, authHeader)
    ]);

    if (!strengths || strengths.length === 0 || !confidenceList || confidenceList.length === 0) {
      const planData = {
        user_id: userId,
        date: new Date().toISOString().split('T')[0],
        sabaq: { surah: 1, type: 'New Lesson' },
        sabaqi: [],
        manzil: []
      };

      const { data: newPlan, error: insertError } = await supabase
        .from('revision_plan')
        .insert(planData)
        .select()
        .single();

      if (insertError) throw new Error(`Error saving plan: ${insertError.message}`);

      return newPlan;
    }

    const confidenceBySurah = new Map();
    confidenceList.forEach(entry => {
      confidenceBySurah.set(entry.surah_id, entry);
    });

    const riskBySurah = new Map();
    (riskList || []).forEach(entry => {
      riskBySurah.set(entry.surah_id, entry);
    });

    const stabilityBySurah = new Map();
    (stabilityList || []).forEach(entry => {
      stabilityBySurah.set(entry.surah_id, entry);
    });

    const allSurahIds = new Set([
      ...confidenceList.map(c => c.surah_id),
      ...(riskList || []).map(r => r.surah_id),
      ...(stabilityList || []).map(s => s.surah_id)
    ]);

    const scored = [];

    const getStabilityWeight = stability => {
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
    };

    allSurahIds.forEach(id => {
      const confidenceEntry = confidenceBySurah.get(id);
      const riskEntry = riskBySurah.get(id);
      const stabilityEntry = stabilityBySurah.get(id);

      const confidence = confidenceEntry && typeof confidenceEntry.confidence === 'number'
        ? confidenceEntry.confidence
        : 0;
      const riskScore = riskEntry && typeof riskEntry.riskScore === 'number'
        ? riskEntry.riskScore
        : 0;
      const stabilityLabel = stabilityEntry ? stabilityEntry.stability : null;
      const stabilityWeight = getStabilityWeight(stabilityLabel);

      const priority =
        0.6 * riskScore +
        0.3 * (100 - confidence) +
        0.1 * stabilityWeight;

      scored.push({
        surah: id,
        confidence,
        riskScore,
        stability: stabilityLabel,
        stabilityWeight,
        priority
      });
    });

    if (scored.length === 0) {
      const planData = {
        user_id: userId,
        date: new Date().toISOString().split('T')[0],
        sabaq: { surah: 1, type: 'New Lesson' },
        sabaqi: [],
        manzil: []
      };

      const { data: newPlan, error: insertError } = await supabase
        .from('revision_plan')
        .insert(planData)
        .select()
        .single();

      if (insertError) throw new Error(`Error saving plan: ${insertError.message}`);

      return newPlan;
    }

    const sortedByPriority = [...scored].sort((a, b) => b.priority - a.priority);

    const sabaqSelection = sortedByPriority[0] || null;
    const sabaqiSelection = sortedByPriority.slice(1, 3);

    // Identify IDs already selected for Sabaq/Sabaqi
    const usedIds = new Set();
    if (sabaqSelection) usedIds.add(sabaqSelection.surah);
    sabaqiSelection.forEach(item => usedIds.add(item.surah));

    // Filter candidates for Manzil (exclude used IDs)
    const manzilCandidates = scored.filter(item => !usedIds.has(item.surah));
    
    let manzilSelection = [];

    if (manzilCandidates.length > 0) {
      // 1. Try to find strong candidates (confidence >= 80)
      const strongCandidates = manzilCandidates.filter(item => item.confidence >= 80);

      if (strongCandidates.length > 0) {
        // Sort by lowest risk (easiest/safest to recite)
        strongCandidates.sort((a, b) => a.riskScore - b.riskScore);
        manzilSelection = [strongCandidates[0]];
      } else {
        // 2. Fallback: Pick the one with highest confidence among remaining
        manzilCandidates.sort((a, b) => b.confidence - a.confidence);
        manzilSelection = [manzilCandidates[0]];
      }
    }

    // 4. Construct Plan Object
    // We store minimal details in JSONB columns
    const planData = {
      user_id: userId,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      sabaq: sabaqSelection ? { surah: sabaqSelection.surah, type: 'High Priority' } : null,
      sabaqi: sabaqiSelection.map(s => ({ surah: s.surah, type: 'High Priority' })),
      manzil: manzilSelection.map(s => ({ surah: s.surah, type: 'Strong (Low Risk)' }))
    };

    // 5. Save to Database
    const { data: newPlan, error: insertError } = await supabase
      .from('revision_plan')
      .insert(planData)
      .select()
      .single();

    if (insertError) throw new Error(`Error saving plan: ${insertError.message}`);

    return newPlan;
  }

  async getTodayPlan(userId, authHeader) {
    const supabase = defaultSupabase;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('revision_plan')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw new Error(`Error fetching plan: ${error.message}`);

    if (data && data.length > 0) {
      const plan = data[0];
      const hasSabaq = Boolean(plan?.sabaq && plan.sabaq.surah != null);
      const hasSabaqi = Array.isArray(plan?.sabaqi) && plan.sabaqi.length > 0;
      const hasManzil = Array.isArray(plan?.manzil) && plan.manzil.length > 0;

      if (!hasSabaq && !hasSabaqi && !hasManzil) {
        return this.generatePlan(userId, authHeader);
      }

      return plan;
    }

    return this.generatePlan(userId, authHeader);
  }

  /**
   * Generates real-time AI suggestions based on recent performance (mistakes, fluency).
   */
  async getAISuggestions(userId, authHeader) {
    const supabase = defaultSupabase;

    // Fetch last 10 sessions to analyze performance
    // Use select('*') to handle missing columns gracefully
    const { data: recentSessions, error } = await supabase
      .from('recitation_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw new Error(`Error fetching recent sessions: ${error.message}`);
    if (!recentSessions || recentSessions.length === 0) return [];

    const surahStats = new Map();
    recentSessions.forEach(session => {
      if (!surahStats.has(session.surah_id)) {
        surahStats.set(session.surah_id, { 
          total_mistakes: 0, 
          avg_accuracy: 0, 
          sessions: 0, 
          pronunciation_issues_count: 0 
        });
      }
      const stats = surahStats.get(session.surah_id);
      stats.total_mistakes += (Number(session.mistake_count) || 0);
      stats.avg_accuracy += (Number(session.accuracy) || 0);
      stats.sessions += 1;
      
      const pIssues = session.pronunciation_issues;
      if (Array.isArray(pIssues)) {
        stats.pronunciation_issues_count += pIssues.length;
      }
    });

    const suggestions = [];
    surahStats.forEach((stats, surahId) => {
      const avgAccuracy = stats.avg_accuracy / stats.sessions;
      
      if (avgAccuracy < 85) {
        suggestions.push({
          surah_id: surahId,
          reason: "Low accuracy detected in recent tests."
        });
      } else if (stats.pronunciation_issues_count > 5) {
        suggestions.push({
          surah_id: surahId,
          reason: "High pronunciation errors detected."
        });
      } else if (stats.total_mistakes > 10) {
        suggestions.push({
          surah_id: surahId,
          reason: "Frequent major mistakes detected."
        });
      }
    });

    // Fetch surah names for the suggestions
    const surahIds = suggestions.map(s => s.surah_id);
    if (surahIds.length === 0) return [];

    const { data: surahNames, error: nameError } = await supabase
      .from('surahs')
      .select('id, transliteration')
      .in('id', surahIds);

    if (nameError) {
      console.warn(`Error fetching surah names from 'surahs' table: ${nameError.message}. Trying 'quran_surahs'...`);
      const { data: quranSurahNames, error: quranNameError } = await supabase
        .from('quran_surahs')
        .select('id, transliteration')
        .in('id', surahIds);
      
      if (quranNameError) throw new Error(`Error fetching surah names: ${quranNameError.message}`);
      
      return suggestions.map(s => ({
        ...s,
        surah_name: quranSurahNames.find(n => n.id === s.surah_id)?.transliteration || `Surah ${s.surah_id}`
      }));
    }

    return suggestions.map(s => ({
      ...s,
      surah_name: surahNames.find(n => n.id === s.surah_id)?.transliteration || `Surah ${s.surah_id}`
    }));
  }

  async saveCustomPlan(userId, planPayload, authHeader) {
    const supabase = defaultSupabase;

    await userService.ensureUserExists(userId, undefined, undefined, authHeader);

    const today = new Date().toISOString().split('T')[0];

    const planData = {
      user_id: userId,
      date: today,
      sabaq: planPayload.sabaq || null,
      sabaqi: planPayload.sabaqi || [],
      manzil: planPayload.manzil || []
    };

    const { data: newPlan, error: insertError } = await supabase
      .from('revision_plan')
      .insert(planData)
      .select()
      .single();

    if (insertError) throw new Error(`Error saving plan: ${insertError.message}`);

    return newPlan;
  }
}

module.exports = new PlannerService();
