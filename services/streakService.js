const disciplineService = require('./disciplineService');

class StreakService {
  /**
   * Calculate the user's current revision streak
   * Delegates to DisciplineService which uses the optimized user_activity_days table.
   * @param {string} userId - The UUID of the user
   * @param {string} [authHeader] - The Authorization header (Bearer token)
   * @returns {Object} The current streak count { current_streak: number }
   */
  async getStreak(userId, authHeader) {
    try {
      const stats = await disciplineService.getDisciplineStats(userId, authHeader);
      return { current_streak: stats.currentStreak || 0 };
    } catch (error) {
      console.error('Error in StreakService (delegating to DisciplineService):', error);
      // Fallback or rethrow? 
      // If table doesn't exist, this might fail.
      // But we want to encourage migration.
      throw error;
    }
  }
}

module.exports = new StreakService();
