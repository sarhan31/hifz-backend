const express = require('express');
const router = express.Router();
const streakController = require('../controllers/streakController');

// GET /api/streak/:user_id - Get current revision streak
router.get('/:user_id', streakController.getStreak);

module.exports = router;
