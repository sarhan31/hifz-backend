const express = require('express');
const router = express.Router();
const surahRiskController = require('../controllers/surahRiskController');

router.get('/:user_id', surahRiskController.getSurahRisk);

module.exports = router;

