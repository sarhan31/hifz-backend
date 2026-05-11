const express = require('express');
const router = express.Router();
const bookmarkController = require('../controllers/bookmarkController');

// GET /api/bookmarks - Fetch all bookmarks for user
router.get('/', bookmarkController.getBookmarks);

// POST /api/bookmarks - Add new bookmark
router.post('/', bookmarkController.addBookmark);

// DELETE /api/bookmarks/:id - Delete bookmark
router.delete('/:id', bookmarkController.deleteBookmark);

// GET /api/bookmarks/last-session/:userId - Fetch last session for user
router.get('/last-session/:userId', bookmarkController.getLastSession);

module.exports = router;
