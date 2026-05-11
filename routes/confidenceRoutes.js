const express = require('express');
const router = express.Router();
const confidenceController = require('../controllers/confidenceController');

router.get('/:user_id', confidenceController.getConfidence);

module.exports = router;

