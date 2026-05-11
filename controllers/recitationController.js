const recitationService = require('../services/recitationService');

exports.createLog = async (req, res) => {
  try {
    const { user_id, surah_number, ayah_start, ayah_end, fluency_score } = req.body;
    
    // Get audio file path if uploaded
    let audio_url = null;
    if (req.file) {
      // Store relative path
      audio_url = `/uploads/recitations/${req.file.filename}`;
    }

    // Basic validation
    if (!user_id || !surah_number || fluency_score === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const logData = { 
      user_id, 
      surah_number, 
      ayah_start, 
      ayah_end, 
      fluency_score,
      audio_url 
    };
    
    // Pass Authorization header to service
    const authHeader = req.headers.authorization;
    const newLog = await recitationService.createLog(logData, authHeader);

    res.status(201).json({ message: "Log saved successfully", data: newLog });
  } catch (error) {
    console.error("Controller Error (createLog):", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Pass Authorization header to service
    const authHeader = req.headers.authorization;
    const logs = await recitationService.getLogs(user_id, authHeader);

    res.status(200).json(logs);
  } catch (error) {
    console.error("Controller Error (getLogs):", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getStrengthStats = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Pass Authorization header to service
    const authHeader = req.headers.authorization;
    const logs = await recitationService.getAllLogsForStats(user_id, authHeader);

    // Group logs by surah_number
    const surahGroups = {};
    logs.forEach(log => {
      if (!surahGroups[log.surah_number]) {
        surahGroups[log.surah_number] = [];
      }
      surahGroups[log.surah_number].push(log.fluency_score);
    });

    // Calculate average and determine strength
    const stats = Object.keys(surahGroups).map(surah => {
      const scores = surahGroups[surah];
      const sum = scores.reduce((a, b) => a + Number(b), 0);
      const avg = sum / scores.length;

      let strength = 'Weak';
      if (avg >= 90) strength = 'Strong';
      else if (avg >= 75) strength = 'Medium';

      return {
        surah_number: parseInt(surah),
        average_score: Math.round(avg),
        strength
      };
    });

    // Sort by Surah number
    stats.sort((a, b) => a.surah_number - b.surah_number);

    res.status(200).json(stats);
  } catch (error) {
    console.error("Controller Error (getStrengthStats):", error);
    res.status(500).json({ error: error.message });
  }
};
