const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const loadQuranData = async () => {
  try {
    const filePath = path.join(__dirname, '../data/quran.json');
    if (!fs.existsSync(filePath)) {
      throw new Error('quran.json not found in data directory');
    }

    const rawData = fs.readFileSync(filePath, 'utf8');
    const quranData = JSON.parse(rawData);

    console.log(`Loaded ${quranData.length} Surahs from JSON.`);

    for (const surah of quranData) {
      // 1. Insert/Update Surah
      const surahData = {
        id: surah.id,
        name_ar: surah.name,
        name_en: surah.transliteration,
        total_ayahs: surah.total_verses
      };

      const { error: surahError } = await supabase
        .from('surahs')
        .upsert(surahData, { onConflict: 'id' });

      if (surahError) {
        console.error(`Error inserting Surah ${surah.id}:`, surahError);
        continue;
      }

      console.log(`Processed Surah ${surah.id}: ${surah.transliteration}`);

      // 2. Prepare Ayahs
      const ayahsData = surah.verses.map(verse => ({
        surah_id: surah.id,
        ayah_number: verse.id,
        text_ar: verse.text
      }));

      // 3. Insert Ayahs (Batch)
      // We use upsert on (surah_id, ayah_number) which is the UNIQUE constraint
      const { error: ayahsError } = await supabase
        .from('ayahs')
        .upsert(ayahsData, { onConflict: 'surah_id,ayah_number', ignoreDuplicates: false });

      if (ayahsError) {
        console.error(`Error inserting ayahs for Surah ${surah.id}:`, ayahsError);
      }
    }

    console.log('Quran data loading complete!');

  } catch (error) {
    console.error('Fatal Error:', error);
  }
};

loadQuranData();
