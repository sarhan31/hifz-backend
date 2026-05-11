const teacherService = require('../services/teacherService');

exports.getStudents = async (req, res) => {
  try {
    const { teacher_id } = req.params;
    if (!teacher_id) {
      return res.status(400).json({ error: "teacher_id is required" });
    }

    const students = await teacherService.getStudentsByTeacher(teacher_id);
    res.json(students);
  } catch (error) {
    console.error("Error in getStudents:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getStudentSummary = async (req, res) => {
  try {
    const { student_id } = req.params;
    if (!student_id) {
      return res.status(400).json({ error: "student_id is required" });
    }

    const summary = await teacherService.getStudentSummary(student_id);
    res.json(summary);
  } catch (error) {
    console.error("Error in getStudentSummary:", error);
    res.status(500).json({ error: error.message });
  }
};
