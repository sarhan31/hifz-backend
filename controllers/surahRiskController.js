const surahRiskService = require('../services/surahRiskService');

exports.getSurahRisk = async (req, res) => {
  try {
    const user_id = req.user?.id || req.params.user_id;

    if (!user_id) {
      return res.status(400).json({ error: 'Authenticated User ID is required' });
    }

    const authHeader = req.headers.authorization;
    const data = await surahRiskService.getSurahRisks(user_id, authHeader);

    res.status(200).json(data);
  } catch (error) {
    console.error('Controller Error (getSurahRisk):', error);
    res.status(500).json({ error: error.message });
  }
};

