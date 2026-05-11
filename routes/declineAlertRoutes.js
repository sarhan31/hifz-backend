const express = require('express');
const router = express.Router();
const declineAlertController = require('../controllers/declineAlertController');

router.get('/:user_id', declineAlertController.getDeclineAlerts);

module.exports = router;

