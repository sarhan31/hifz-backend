const express = require('express');
const router = express.Router();
const surahStabilityController = require('../controllers/surahStabilityController');

router.get('/:user_id', surahStabilityController.getStability);

module.exports = router;

