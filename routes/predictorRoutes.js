const express = require('express');
const router = express.Router();
const predictorController = require('../controllers/predictorController');

// GET /api/memory-risk/:user_id
router.get('/:user_id', predictorController.getMemoryRisk);

module.exports = router;
