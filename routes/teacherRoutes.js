const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');

// GET /api/teacher/students/:teacher_id
router.get('/students/:teacher_id', teacherController.getStudents);

// GET /api/teacher/student/:student_id/summary
router.get('/student/:student_id/summary', teacherController.getStudentSummary);

module.exports = router;
