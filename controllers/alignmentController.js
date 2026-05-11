const alignmentService = require('../services/alignmentService');

exports.alignRecitation = async (req, res) => {
    try {
        const { expectedText, spokenText } = req.body;

        if (!expectedText) {
            return res.status(400).json({ error: "expectedText is required" });
        }

        const comparison = alignmentService.compareRecitation(expectedText, spokenText);
        res.json(comparison);

    } catch (error) {
        console.error("Error in alignRecitation:", error);
        res.status(500).json({ error: error.message });
    }
};
