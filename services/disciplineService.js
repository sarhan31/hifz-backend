const { createClient } = require('@supabase/supabase-js');
const supabase = require('../db/supabaseClient');

class DisciplineService {
  /**
   * Records a valid Hifz Test activity for the user.
   * Increments test_count and sets valid = true for the current date.
   * @param {string} userId - The UUID of the user
   * @param {string} [authHeader] - Optional Authorization header
   */
  async recordActivity(userId, authHeader) {
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

    const today = new Date().toISOString().split('T')[0];

    // Check if a record exists for today
    const { data: existingRecord, error: fetchError } = await client
      .from('user_activity_days')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching user activity:', fetchError);
      // Don't throw, just log, so we don't break the session save
      return;
    }

    if (existingRecord) {
      // Update existing record
      const { error: updateError } = await client
        .from('user_activity_days')
        .update({
          test_count: existingRecord.test_count + 1,
          valid: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id);

      if (updateError) {
        console.error('Error updating user activity:', updateError);
      }
    } else {
      // Insert new record
      const { error: insertError } = await client
        .from('user_activity_days')
        .insert([{
          user_id: userId,
          date: today,
          test_count: 1,
          valid: true
        }]);

      if (insertError) {
        console.error('Error inserting user activity:', insertError);
      }
    }
  }

  /**
   * Get discipline stats: current streak, longest streak, weekly consistency, and heatmap data.
   * @param {string} userId 
   * @param {string} [authHeader] 
   */
  async getDisciplineStats(userId, authHeader) {
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

    // Fetch all valid activity days for streak calculation
    const { data: allActivity, error } = await client
      .from('user_activity_days')
      .select('date, test_count, valid')
      .eq('user_id', userId)
      .eq('valid', true)
      .order('date', { ascending: false });

    if (error) {
      console.warn(`Error fetching user_activity_days: ${error.message}. Falling back to recitation logs.`);
    }

    // FALLBACK: If user_activity_days is empty or error, try to derive from recitation tables
    let uniqueDates = new Set((allActivity || []).map(a => a.date));
    
    if (uniqueDates.size === 0) {
      console.log("Deriving streak from recitation_sessions and logs...");
      const [sessionsRes, logsRes] = await Promise.all([
        client.from('recitation_sessions').select('created_at').eq('user_id', userId),
        client.from('recitation_logs').select('created_at').eq('user_id', userId)
      ]);

      const allDates = [
        ...(sessionsRes.data || []).map(s => s.created_at.split('T')[0]),
        ...(logsRes.data || []).map(l => l.created_at.split('T')[0])
      ];
      uniqueDates = new Set(allDates);
    }

    const activities = allActivity || [];

    // 1. Calculate Current Streak
    let currentStreak = 0;
    // Use local time for "today" calculation to be more user-friendly
    const now = new Date();
    
    const checkStreak = (date) => {
      const dStr = date.toISOString().split('T')[0];
      return uniqueDates.has(dStr);
    };

    let checkDate = new Date(now);
    let dateStr = checkDate.toISOString().split('T')[0];

    // Check today or yesterday to start the streak
    if (checkStreak(checkDate)) {
      currentStreak = 1;
    } else {
      checkDate.setDate(checkDate.getDate() - 1);
      if (checkStreak(checkDate)) {
        currentStreak = 1;
      } else {
        currentStreak = 0;
      }
    }

    // Continue counting back if streak is active
    if (currentStreak > 0) {
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        if (checkStreak(checkDate)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // 2. Calculate Longest Streak
    // Sort dates ascending
    const sortedDates = Array.from(uniqueDates).sort();
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate = null;

    for (const dStr of sortedDates) {
      const currentDate = new Date(dStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffTime = Math.abs(currentDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      prevDate = currentDate;
    }

    // 3. Weekly Consistency (Last 7 days)
    // Consistency = (ValidDaysLast7 / 7) * 100
    let validDaysLast7 = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      if (uniqueDates.has(dStr)) {
        validDaysLast7++;
      }
    }
    const weeklyConsistency = Math.round((validDaysLast7 / 7) * 100);

    // 4. Activity Heatmap (Last 365 days)
    // Return array of { date, score }
    // Fetch last 365 days of data including test_count.
    
    const heatmapData = [];
    // Calculate start date for 365 days ago
    const today = new Date();
    // We want the grid to end on today.
    // GitHub usually shows 52-53 weeks.
    // Let's generate 365 days.
    
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      
      const activity = activities.find(a => a.date === dStr);
      heatmapData.push({
        date: dStr,
        count: activity ? activity.test_count : 0
      });
    }

    return {
      currentStreak,
      longestStreak,
      weeklyConsistency,
      activityHeatmap: heatmapData
    };
  }
}

module.exports = new DisciplineService();
