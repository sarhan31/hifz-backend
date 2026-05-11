const supabase = require('../db/supabaseClient');
const streakService = require('./streakService');
const strengthService = require('./strengthService');
const recitationService = require('./recitationService');

class TeacherService {
  /**
   * Get all students for a specific teacher
   * @param {string} teacherId - The UUID of the teacher
   * @returns {Array} List of students
   */
  async getStudentsByTeacher(teacherId) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('teacher_id', teacherId);

    if (error) {
      console.warn(`Error fetching students (using mock data): ${error.message}`);
      // Fallback to mock data for demo if RLS blocks access
      return this.getMockStudents(teacherId);
    }

    if (!data || data.length === 0) {
        console.log("No students found in DB, returning mock data for demo.");
        return this.getMockStudents(teacherId);
    }

    return data;
  }

  getMockStudents(teacherId) {
      return [
          { id: 'mock-1', name: 'Ahmed Ali', email: 'ahmed@example.com', teacher_id: teacherId },
          { id: 'mock-2', name: 'Fatima Hassan', email: 'fatima@example.com', teacher_id: teacherId },
          { id: 'mock-3', name: 'Yusuf Khan', email: 'yusuf@example.com', teacher_id: teacherId },
          { id: 'mock-4', name: 'Omar Farooq', email: 'omar@example.com', teacher_id: teacherId },
      ];
  }

  /**
   * Get summary statistics for a specific student
   * @param {string} studentId - The UUID of the student
   * @returns {Object} Student summary (streak, weak surahs, recent recitations)
   */
  async getStudentSummary(studentId) {
    if (studentId.startsWith('mock-')) {
        return this.getMockStudentSummary(studentId);
    }

    // Parallelize independent service calls for better performance
    const [streakResult, strengthResult, recentLogs] = await Promise.all([
      streakService.getStreak(studentId),
      strengthService.getStrengthAnalysis(studentId),
      recitationService.getLogs(studentId)
    ]);

    // Filter for weak surahs only
    const weakSurahs = strengthResult.filter(s => s.strength === 'weak');

    return {
      streak: streakResult.current_streak,
      weak_surahs: weakSurahs,
      recent_recitations: recentLogs
    };
  }

  getMockStudentSummary(studentId) {
      // Return deterministic mock data based on ID
      const isGoodStudent = studentId === 'mock-2';
      
      return {
          streak: isGoodStudent ? 12 : 3,
          weak_surahs: isGoodStudent ? [] : [
              { surah: 114, strength: 'weak', avg_score: 65 },
              { surah: 113, strength: 'weak', avg_score: 70 }
          ],
          recent_recitations: [
              { 
                  id: 'log-1', 
                  created_at: new Date().toISOString(), 
                  surah_number: 1, 
                  fluency_score: isGoodStudent ? 95 : 75, 
                  audio_url: null 
              },
              { 
                  id: 'log-2', 
                  created_at: new Date(Date.now() - 86400000).toISOString(), 
                  surah_number: 112, 
                  fluency_score: 88, 
                  audio_url: null 
              }
          ]
      };
  }
}

module.exports = new TeacherService();
