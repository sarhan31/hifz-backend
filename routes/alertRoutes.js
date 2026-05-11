const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

router.get('/:user_id', alertController.getAlerts);

module.exports = router;
