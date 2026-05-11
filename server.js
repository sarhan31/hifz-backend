const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const path = require('path');
const authMiddleware = require('./middleware/authMiddleware');

const revisionRoutes = require('./routes/revisionRoutes');
const recitationRoutes = require('./routes/recitationRoutes');
const recitationSessionRoutes = require('./routes/recitationSessionRoutes');
const strengthRoutes = require('./routes/strengthRoutes');
const alertRoutes = require('./routes/alertRoutes');
const streakRoutes = require('./routes/streakRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const predictorRoutes = require('./routes/predictorRoutes');
const alignmentRoutes = require('./routes/alignmentRoutes');
const quranRoutes = require('./routes/quranRoutes');
const confidenceRoutes = require('./routes/confidenceRoutes');
const declineAlertRoutes = require('./routes/declineAlertRoutes');
const surahStabilityRoutes = require('./routes/surahStabilityRoutes');
const surahRiskRoutes = require('./routes/surahRiskRoutes');
const wordMistakeRoutes = require('./routes/wordMistakeRoutes');
const bootstrapRoutes = require('./routes/bootstrapRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: "Huffaz Companion API Running" });
});

// Bootstrapping endpoint: verifies Supabase connectivity and minimal data access
app.get('/api/bootstrap', async (_req, res) => {
  try {
    const supabase = require('./db/supabaseClient');
    // Try simple, safe queries to confirm DB connectivity
    const tables = ['users', 'recitation_logs', 'recitation_sessions'];
    let connected = false;
    for (const t of tables) {
      try {
        const { error } = await supabase.from(t).select('id').limit(1);
        if (!error) {
          connected = true;
          break;
        }
      } catch (_e) {
        // ignore and try next table
      }
    }

    if (!connected) {
      return res.status(503).json({ status: 'error', reason: 'supabase_unavailable' });
    }

    // Optionally ensure minimal essential data is accessible (best-effort)
    // Not strictly required to respond "ready", but helps validate shape
    // We avoid hard dependency on specific tables; the connectivity check above suffices.

    return res.json({ status: 'ready' });
  } catch (err) {
    console.error('Bootstrap check failed:', err.message);
    return res.status(503).json({ status: 'error', reason: 'bootstrap_failed' });
  }
});

app.use('/api/revision-plan', revisionRoutes);
app.use('/api/recitation-log', recitationRoutes);
app.use('/api/recitation-session', recitationSessionRoutes);
app.use('/api/recitation-sessions', recitationSessionRoutes);
app.use('/api/surah-strength', strengthRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/memory-risk', predictorRoutes);
app.use('/api/alignment', alignmentRoutes);
app.use('/api/quran', quranRoutes);
app.use('/api/surah-confidence', confidenceRoutes);
app.use('/api/decline-alerts', declineAlertRoutes);
app.use('/api/surah-stability', surahStabilityRoutes);
app.use('/api/surah-risk', surahRiskRoutes);
app.use('/api/word-mistakes', wordMistakeRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/dashboard/bootstrap', bootstrapRoutes);

// Build Quran Phrase Index on startup
const quranService = require('./services/quranService');
quranService.buildPhraseIndex().catch(err => console.error("Phrase index error:", err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
