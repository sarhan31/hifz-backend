const strengthService = require('../services/strengthService');

exports.getStrengthAnalysis = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const authHeader = req.headers.authorization;
    const analysis = await strengthService.getStrengthAnalysis(user_id, authHeader);

    res.status(200).json(analysis);
  } catch (error) {
    console.error("Controller Error (getStrengthAnalysis):", error);
    res.status(500).json({ error: error.message });
  }
};
