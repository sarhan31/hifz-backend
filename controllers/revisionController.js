const plannerService = require('../services/plannerService');

exports.generatePlan = async (req, res) => {
  try {
    const user_id = req.user?.id || req.body.user_id;

    if (!user_id) {
      return res.status(400).json({ error: "Authenticated User ID is required" });
    }

    const authHeader = req.headers.authorization;
    const plan = await plannerService.generatePlan(user_id, authHeader);

    res.status(200).json(plan);
  } catch (error) {
    console.error("Planner Error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getTodayPlan = async (req, res) => {
  try {
    const user_id = req.user?.id || req.params.user_id;

    if (!user_id) {
      return res.status(400).json({ error: "Authenticated User ID is required" });
    }

    const authHeader = req.headers.authorization;
    const plan = await plannerService.getTodayPlan(user_id, authHeader);

    res.status(200).json(plan);
  } catch (error) {
    console.error("Planner Today Error:", error);
    // Return a null/empty plan instead of 500 to keep UI stable
    res.status(200).json(null);
  }
};

exports.getAISuggestions = async (req, res) => {
  try {
    const user_id = req.user?.id || req.params.user_id;

    if (!user_id) {
      return res.status(400).json({ error: "Authenticated User ID is required" });
    }

    const authHeader = req.headers.authorization;
    const suggestions = await plannerService.getAISuggestions(user_id, authHeader);

    res.status(200).json(suggestions);
  } catch (error) {
    console.error("Planner AI Suggestions Error:", error);
    // Don't throw 500 for AI suggestions, just return empty list to keep dashboard running
    res.status(200).json([]);
  }
};

exports.saveCustomPlan = async (req, res) => {
  try {
    const user_id = req.user?.id || req.body.user_id;
    const { sabaq, sabaqi, manzil } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "Authenticated User ID is required" });
    }

    const authHeader = req.headers.authorization;
    const plan = await plannerService.saveCustomPlan(
      user_id,
      { sabaq, sabaqi, manzil },
      authHeader
    );

    res.status(200).json(plan);
  } catch (error) {
    console.error("Planner Custom Error:", error);
    res.status(500).json({ error: error.message });
  }
};
