const express = require('express');
const router = express.Router();
const strengthController = require('../controllers/strengthController');

// GET /api/surah-strength/:user_id
router.get('/:user_id', strengthController.getStrengthAnalysis);

module.exports = router;
