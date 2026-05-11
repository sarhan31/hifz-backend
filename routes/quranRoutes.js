const express = require('express');
const router = express.Router();
const quranController = require('../controllers/quranController');

// GET /api/quran/surahs - Fetch all surahs
router.get('/surahs', quranController.getAllSurahs);

// GET /api/quran/surah/:id - Fetch all ayahs for given surah
router.get('/surah/:id', quranController.getSurah);

// POST /api/quran/detect - Detect ayah based on spoken phrase
router.post('/detect', quranController.detectAyah);

module.exports = router;
