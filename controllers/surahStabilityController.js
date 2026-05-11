const surahStabilityService = require('../services/surahStabilityService');

exports.getStability = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const authHeader = req.headers.authorization;
    const data = await surahStabilityService.getStability(user_id, authHeader);

    res.status(200).json(data);
  } catch (error) {
    console.error('Controller Error (getStability):', error);
    res.status(500).json({ error: error.message });
  }
};

