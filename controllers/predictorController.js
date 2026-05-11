const predictorService = require('../services/predictorService');

exports.getMemoryRisk = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const authHeader = req.headers.authorization;
    const risks = await predictorService.getMemoryRisks(user_id, authHeader);
    res.json(risks);
  } catch (error) {
    console.error("Error in getMemoryRisk:", error);
    res.status(500).json({ error: error.message });
  }
};
