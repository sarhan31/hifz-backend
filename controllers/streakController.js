const disciplineService = require('../services/disciplineService');

exports.getStreak = async (req, res) => {
  try {
    const user_id = req.user?.id || req.params.user_id;

    if (!user_id) {
      return res.status(400).json({ error: "Authenticated User ID is required" });
    }

    const authHeader = req.headers.authorization;
    const stats = await disciplineService.getDisciplineStats(user_id, authHeader);

    res.status(200).json(stats);
  } catch (error) {
    console.error("Controller Error (getStreak/DisciplineStats):", error);
    res.status(500).json({ error: error.message });
  }
};
