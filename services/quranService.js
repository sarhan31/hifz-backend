const quranData = require('../data/quran.json');

class QuranService {
  constructor() {
    this.phraseIndex = new Map();
    this.wordToPhrases = new Map(); // Inverted index: word -> Set of phrases
    this.isIndexed = false;
    this.threshold = 0.45; // Lowered further for noisy speech and varied pronunciations
  }

  /**
   * Build a comprehensive in-memory phrase index with inverted word mapping
   */
  async buildPhraseIndex() {
    if (this.isIndexed) return;
    console.log("Building High-Precision Quran Phrase Index...");
    
    const start = Date.now();
    quranData.forEach(surah => {
      surah.verses.forEach(verse => {
        const text = this.normalizeArabic(verse.text);
        const words = text.split(/\s+/).filter(w => w.length > 0);
        
        // Index windows of 1, 2, 3, 4, 5, 6 words for maximum coverage
        // Added 1-word indexing for very unique short ayahs
        for (let len = 1; len <= 6; len++) {
          for (let i = 0; i <= words.length - len; i++) {
            const phraseWords = words.slice(i, i + len);
            const phrase = phraseWords.join(' ');
            
            this.addToIndex(phrase, surah.id, verse.id);
            
            // Inverted index for fast lookup
            phraseWords.forEach(word => {
              if (!this.wordToPhrases.has(word)) {
                this.wordToPhrases.set(word, new Set());
              }
              this.wordToPhrases.get(word).add(phrase);
            });
          }
        }
      });
    });

    this.isIndexed = true;
    console.log(`High-Precision Index Built with ${this.phraseIndex.size} phrases in ${Date.now() - start}ms.`);
  }

  addToIndex(phrase, surahId, ayahNumber) {
    if (!this.phraseIndex.has(phrase)) {
      this.phraseIndex.set(phrase, []);
    }
    const entries = this.phraseIndex.get(phrase);
    if (!entries.some(e => e.surah_id === surahId && e.ayah_number === ayahNumber)) {
      entries.push({ surah_id: surahId, ayah_number: ayahNumber });
    }
  }

  /**
   * Even more aggressive normalization for speech-to-text noise
   */
  normalizeArabic(text) {
    if (!text) return "";
    return text
      .replace(/[ًٌٍَُِّْـ]/g, "") // Remove Harakat
      .replace(/[أإآٱ]/g, "ا") // Normalize Alifs
      .replace(/[ىيئ]/g, "ي") // Normalize Yaa
      .replace(/ة/g, "ه") // Normalize Taa Marbuta
      .replace(/ؤ/g, "و") // Normalize Hamza on Waw
      .replace(/ء/g, "") // Remove isolated Hamza
      // Phonetic collapse for noisy speech - EXPANDED
      .replace(/[ثسص]/g, "s") 
      .replace(/[حخ]/g, "h")
      .replace(/[ذزظ]/g, "z")
      .replace(/[طق]/g, "k")
      .replace(/[تد]/g, "t") // Added T/D group
      .replace(/[غع]/g, "a") // Added A group for Ghein/Ain
      .replace(/[بف]/g, "b") // Added B/F group (often confused in noisy STT)
      // Whitelist Arabic letters + phonetic groups
      .replace(/[^\u0621-\u064A\s shzkta b]/g, "") 
      .replace(/\s+/g, " ") 
      .trim();
  }

  /**
   * Flexible removal of Bismillah and Istia'dhah
   */
  removePreliminaries(text) {
    let cleaned = this.normalizeArabic(text);
    // Remove "A'udhu billahi minashaitanir rajim" variations
    cleaned = cleaned.replace(/اعوذ بالله من الشيطان الرجيم/g, "");
    cleaned = cleaned.replace(/اعوذ بالله من الشيطان/g, "");
    // Remove "Bismillahir Rahmanir Rahim" variations
    cleaned = cleaned.replace(/بسم الله الرحمن الرحيم/g, "");
    cleaned = cleaned.replace(/بسم الله الرحمن/g, "");
    cleaned = cleaned.replace(/بسم الله/g, "");
    return cleaned.trim();
  }

  levenshteinDistance(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      }
    }
    return matrix[a.length][b.length];
  }

  /**
   * Best-Match Detection Pipeline - RE-ENGINEERED FOR DISAMBIGUATION
   */
  async detectAyah(spokenPhrase) {
    const start = Date.now();
    if (!this.isIndexed) await this.buildPhraseIndex();
    
    const cleaned = this.removePreliminaries(spokenPhrase);
    const spokenWords = cleaned.split(/\s+/).filter(w => w.length > 0);
    
    if (spokenWords.length < 1) return { detected: false };

    const candidates = new Map();
    const processedPhrases = new Set();

    // 1. Try sliding windows from longest to shortest
    for (let len = Math.min(spokenWords.length, 6); len >= 1; len--) {
      const windowsToCheck = [];
      const startIndex = Math.max(0, spokenWords.length - 15);
      for (let j = startIndex; j <= spokenWords.length - len; j++) {
        windowsToCheck.push(spokenWords.slice(j, j + len).join(" "));
      }

      for (const windowPhrase of windowsToCheck) {
        // A. Exact Match (O(1))
        const exact = this.phraseIndex.get(windowPhrase);
        if (exact) {
          exact.forEach(m => {
            const key = `${m.surah_id}:${m.ayah_number}`;
            // Weight: length^3.5 (Huge boost for length)
            const score = 1.0 * Math.pow(len, 3.5);
            if (!candidates.has(key) || candidates.get(key) < score) candidates.set(key, score);
          });
        }

        // B. Fuzzy Candidate Lookup
        const windowWords = windowPhrase.split(' ');
        const potentialPhrases = new Set();
        
        windowWords.forEach(word => {
          const matchingPhrases = this.wordToPhrases.get(word);
          if (matchingPhrases) {
            matchingPhrases.forEach(p => {
              const pLen = p.split(' ').length;
              if (pLen >= len - 1 && pLen <= len + 1) potentialPhrases.add(p);
            });
          }
        });

        for (const indexedPhrase of potentialPhrases) {
          if (processedPhrases.has(indexedPhrase)) continue;
          if (Math.abs(windowPhrase.length - indexedPhrase.length) > 10) continue;

          const dist = this.levenshteinDistance(windowPhrase, indexedPhrase);
          const maxLen = Math.max(windowPhrase.length, indexedPhrase.length);
          const similarity = 1 - (dist / maxLen);

          if (similarity >= this.threshold) {
            const matches = this.phraseIndex.get(indexedPhrase);
            matches.forEach(m => {
              const key = `${m.surah_id}:${m.ayah_number}`;
              const score = similarity * Math.pow(len, 2.8);
              if (!candidates.has(key) || candidates.get(key) < score) candidates.set(key, score);
            });
          }
          processedPhrases.add(indexedPhrase);
        }
      }
      
      // Early break only if we have a CLEAR winner (one candidate much stronger than others)
      if (candidates.size > 0 && len >= 3) {
        const scores = Array.from(candidates.values()).sort((a, b) => b - a);
        if (scores.length === 1 || scores[0] > scores[1] * 2) break; 
      }
    }

    if (candidates.size === 0) return { detected: false };

    // 2. Disambiguation Logic
    const sorted = Array.from(candidates.entries()).sort((a, b) => b[1] - a[1]);
    
    // Check if the top results are too close (Ambiguity)
    const topCandidates = sorted.slice(0, 3);
    const bestScore = topCandidates[0][1];
    
    // Find all candidates within 80% of the best score
    const competing = topCandidates.filter(c => c[1] >= bestScore * 0.8);
    
    if (competing.length > 1) {
      // It's ambiguous!
      const possibleSurahs = competing.map(c => {
        const [sid] = c[0].split(':').map(Number);
        const surah = quranData.find(s => s.id === sid);
        return surah ? surah.transliteration : "Unknown";
      });

      // Filter unique surah names
      const uniqueSurahs = [...new Set(possibleSurahs)];

      console.log(`Ambiguity detected between: ${uniqueSurahs.join(", ")}`);
      
      return {
        detected: true,
        isAmbiguous: true,
        possibleSurahs: uniqueSurahs,
        confidence: 0.3 // Low confidence prevents auto-jump
      };
    }

    const [bestKey, topScore] = sorted[0];
    const [surahId, ayahNumber] = bestKey.split(':').map(Number);
    
    // Find the phrase that matched
    let matchedPhraseText = "";
    for (const [phrase, entries] of this.phraseIndex.entries()) {
      if (entries.some(e => `${e.surah_id}:${e.ayah_number}` === bestKey)) {
        if (phrase.split(' ').length > matchedPhraseText.split(' ').length) {
          matchedPhraseText = phrase;
        }
      }
    }

    // Final confidence normalization
    let confidence = Math.min(1.0, topScore / 20);
    if (topScore <= 1.5) confidence *= 0.3;

    console.log(`Perfect Detection: Surah ${surahId} Ayah ${ayahNumber} (Score: ${topScore.toFixed(2)}, Conf: ${confidence.toFixed(2)}) in ${Date.now() - start}ms`);

    return {
      detected: true,
      isAmbiguous: false,
      surah: surahId,
      ayah: ayahNumber,
      confidence: Math.min(1.0, parseFloat(confidence.toFixed(2))),
      matchedText: matchedPhraseText
    };
  }

  async getAyahsBySurah(surahId) {
    const surah = quranData.find(s => s.id === parseInt(surahId));
    if (!surah) throw new Error(`Surah with ID ${surahId} not found`);
    return surah.verses.map(v => ({
      id: v.id,
      surah_id: surah.id,
      ayah_number: v.id,
      text_ar: v.text
    }));
  }

  async getAllSurahs() {
    return quranData.map(surah => {
      const { verses, ...surahInfo } = surah;
      return surahInfo;
    });
  }
}

module.exports = new QuranService();
