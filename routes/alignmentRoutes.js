const express = require('express');
const router = express.Router();
const alignmentController = require('../controllers/alignmentController');

router.post('/', alignmentController.alignRecitation);

module.exports = router;
