const wordMistakeService = require('../services/wordMistakeService');

exports.recordMajorMistake = async (req, res) => {
  try {
    const { user_id, surah_id, ayah_number, word_text } = req.body;

    if (!user_id || !surah_id || !ayah_number || !word_text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const payload = {
      user_id,
      surah_id: Number(surah_id),
      ayah_number: Number(ayah_number),
      word_text: String(word_text)
    };

    const authHeader = req.headers.authorization;
    const saved = await wordMistakeService.recordMajorMistake(payload, authHeader);
    res.status(200).json(saved);
  } catch (error) {
    console.error('Controller Error (recordMajorMistake):', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAnchors = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const authHeader = req.headers.authorization;
    const anchors = await wordMistakeService.getAnchors(user_id, authHeader);
    res.status(200).json(anchors);
  } catch (error) {
    console.error('Controller Error (getAnchors):', error);
    res.status(500).json({ error: error.message });
  }
};
