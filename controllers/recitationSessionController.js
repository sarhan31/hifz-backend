const recitationSessionService = require('../services/recitationSessionService');

exports.createSession = async (req, res) => {
  try {
    const user_id = req.user?.id || req.body.user_id;
    const { surah_id, accuracy, fluency_score, mistake_count, pause_count, duration_seconds, words_per_minute, ayah_range, pronunciation_issues } = req.body;

    if (!user_id || !surah_id) {
      return res.status(400).json({ error: "Authenticated User ID or Surah ID is missing" });
    }

    const authHeader = req.headers.authorization;
    const sessionData = {
      user_id,
      surah_id,
      accuracy,
      fluency_score,
      mistake_count,
      pause_count,
      duration_seconds,
      words_per_minute,
      ayah_range,
      pronunciation_issues
    };

    const savedSession = await recitationSessionService.createSession(sessionData, authHeader);

    res.status(201).json({ message: "Session saved successfully", data: savedSession });
  } catch (error) {
    console.error("Controller Error (createSession):", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getWeeklySummary = async (req, res) => {
  try {
    const user_id = req.user?.id || req.params.user_id;

    if (!user_id) {
      return res.status(400).json({ error: "Authenticated User ID is required" });
    }

    const authHeader = req.headers.authorization;
    const summary = await recitationSessionService.getWeeklySummary(user_id, authHeader);

    res.status(200).json(summary);
  } catch (error) {
    console.error("Controller Error (getWeeklySummary):", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getTodaySummary = async (req, res) => {
  try {
    const user_id = req.user?.id || req.params.user_id;

    if (!user_id) {
      return res.status(400).json({ error: "Authenticated User ID is required" });
    }

    const authHeader = req.headers.authorization;
    const summary = await recitationSessionService.getTodaySummary(user_id, authHeader);

    res.status(200).json(summary);
  } catch (error) {
    console.error("Controller Error (getTodaySummary):", error);
    res.status(500).json({ error: error.message });
  }
};
