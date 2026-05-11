const express = require('express');
const router = express.Router();
const recitationSessionController = require('../controllers/recitationSessionController');

router.post('/', recitationSessionController.createSession);
router.get('/today/:user_id', recitationSessionController.getTodaySummary);
router.get('/weekly/:user_id', recitationSessionController.getWeeklySummary);

module.exports = router;
