const strengthService = require('../services/strengthService');

exports.getConfidence = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const authHeader = req.headers.authorization;
    const confidence = await strengthService.getConfidenceScores(user_id, authHeader);

    res.status(200).json(confidence);
  } catch (error) {
    console.error("Controller Error (getConfidence):", error);
    res.status(500).json({ error: error.message });
  }
};

