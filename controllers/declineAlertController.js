const strengthService = require('../services/strengthService');

exports.getDeclineAlerts = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const authHeader = req.headers.authorization;
    const alerts = await strengthService.getDeclineAlerts(user_id, authHeader);

    res.status(200).json(alerts);
  } catch (error) {
    console.error("Controller Error (getDeclineAlerts):", error);
    res.status(500).json({ error: error.message });
  }
};

