const quranService = require('../services/quranService');
const { splitAyahIntoWords } = require('../utils/quranParser');

exports.getSurah = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Surah ID is required" });
    }

    const ayahs = await quranService.getAyahsBySurah(id);

    // Format response with structured words
    const structuredAyahs = ayahs.map(ayah => ({
      ...ayah,
      words: splitAyahIntoWords(ayah.text_ar)
    }));

    const response = {
      surah: parseInt(id),
      ayahs: structuredAyahs
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Controller Error (getSurah):", error);
    res.status(500).json({ error: error.message });
  }
};

exports.detectAyah = async (req, res) => {
  try {
    const { phrase } = req.body;
    if (!phrase) return res.status(400).json({ error: "Phrase is required" });
    
    const result = await quranService.detectAyah(phrase);
    
    // Always return 200, use 'detected' flag to communicate status
    res.status(200).json(result);
  } catch (error) {
    console.error("detectAyah controller error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllSurahs = async (req, res) => {
  try {
    const surahs = await quranService.getAllSurahs();
    res.status(200).json(surahs);
  } catch (error) {
    console.error("Controller Error (getAllSurahs):", error);
    res.status(500).json({ error: error.message });
  }
};
