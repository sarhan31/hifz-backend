const { createClient } = require('@supabase/supabase-js');
const supabase = require('../db/supabaseClient');
const userService = require('./userService');

class WordMistakeService {
  async recordMajorMistake(payload, authHeader) {
    const { user_id, surah_id, ayah_number, word_text } = payload;

    await userService.ensureUserExists(user_id, undefined, undefined, authHeader);

    let client = supabase;
    if (authHeader) {
      client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );
    }

    const { data: existing, error: findError } = await client
      .from('word_mistakes')
      .select('id, mistake_count')
      .eq('user_id', user_id)
      .eq('surah_id', surah_id)
      .eq('ayah_number', ayah_number)
      .eq('word_text', word_text)
      .maybeSingle();

    if (findError) {
      throw new Error(`Error fetching word mistake row: ${findError.message}`);
    }

    const today = new Date().toISOString().slice(0, 10);

    if (!existing) {
      const { data, error } = await client
        .from('word_mistakes')
        .insert([{
          user_id,
          surah_id,
          ayah_number,
          word_text,
          mistake_count: 1,
          last_mistake_date: today
        }])
        .select('user_id, surah_id, ayah_number, word_text, mistake_count, last_mistake_date')
        .single();

      if (error) {
        // If it's a duplicate key error, someone else inserted it between our check and now.
        // Try one more time which will now find the record and update it.
        if (error.code === '23505') {
          return this.recordMajorMistake(payload, authHeader);
        }
        throw new Error(`Error inserting word mistake row: ${error.message}`);
      }

      return data;
    }

    const nextCount = Number(existing.mistake_count || 0) + 1;

    const { data, error: updateError } = await client
      .from('word_mistakes')
      .update({
        mistake_count: nextCount,
        last_mistake_date: today
      })
      .eq('id', existing.id)
      .select('user_id, surah_id, ayah_number, word_text, mistake_count, last_mistake_date')
      .single();

    if (updateError) {
      throw new Error(`Error updating word mistake row: ${updateError.message}`);
    }

    return data;
  }

  async getAnchors(userId, authHeader) {
    let client = supabase;
    if (authHeader) {
      client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );
    }

    const { data, error } = await client
      .from('word_mistakes')
      .select('surah_id, ayah_number, word_text, mistake_count, last_mistake_date')
      .eq('user_id', userId)
      .gte('mistake_count', 3)
      .order('mistake_count', { ascending: false })
      .order('last_mistake_date', { ascending: false });

    if (error) {
      throw new Error(`Error fetching memory anchors: ${error.message}`);
    }

    return data || [];
  }
}

module.exports = new WordMistakeService();
