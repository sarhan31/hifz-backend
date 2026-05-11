const express = require('express');
const router = express.Router();
const wordMistakeController = require('../controllers/wordMistakeController');

router.post('/major', wordMistakeController.recordMajorMistake);
router.get('/anchors/:user_id', wordMistakeController.getAnchors);

module.exports = router;
