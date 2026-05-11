const bookmarkService = require('../services/bookmarkService');

exports.getBookmarks = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || req.body.user_id;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const bookmarks = await bookmarkService.getBookmarks(userId);
    res.status(200).json(bookmarks);
  } catch (error) {
    console.error("getBookmarks error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.addBookmark = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.user_id;
    if (!userId) {
      console.error("Add Bookmark Failed: No User ID");
      return res.status(400).json({ error: "User ID is required" });
    }
    const bookmark = await bookmarkService.addBookmark(userId, req.body);
    res.status(201).json(bookmark);
  } catch (error) {
    console.error("Add Bookmark Error (Controller):", error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBookmark = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.user_id;
    const { id } = req.params;
    if (!userId || !id) return res.status(400).json({ error: "User ID and Bookmark ID are required" });
    await bookmarkService.deleteBookmark(userId, id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLastSession = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const session = await bookmarkService.getLastSession(userId);
    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
