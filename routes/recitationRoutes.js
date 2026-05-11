const express = require('express');
const router = express.Router();
const recitationController = require('../controllers/recitationController');
const upload = require('../middleware/uploadMiddleware');

// POST /api/recitation-log - Save a new log (with optional audio upload)
router.post('/', upload.single('audio'), recitationController.createLog);

// GET /api/recitation-log/stats/:user_id - Get surah strength stats
router.get('/stats/:user_id', recitationController.getStrengthStats);

// GET /api/recitation-log/:user_id - Get recent logs
router.get('/:user_id', recitationController.getLogs);

module.exports = router;
