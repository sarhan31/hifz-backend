const express = require('express');
const router = express.Router();
const revisionController = require('../controllers/revisionController');

router.post('/generate', revisionController.generatePlan);
router.get('/today/:user_id', revisionController.getTodayPlan);
router.get('/suggestions/:user_id', revisionController.getAISuggestions);
router.post('/custom', revisionController.saveCustomPlan);

module.exports = router;
