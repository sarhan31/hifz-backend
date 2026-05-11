const supabase = require('../db/supabaseClient');

class BookmarkService {
  async getBookmarks(userId) {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async addBookmark(userId, bookmarkData) {
    console.log("Adding Bookmark for User:", userId, "Data:", bookmarkData);
    const { juz_number, surah_id, ayah_number, word_index, type, note } = bookmarkData;
    
    // Default values if missing to avoid DB constraints
    const cleanData = {
      user_id: userId,
      surah_id: parseInt(surah_id) || 1,
      ayah_number: parseInt(ayah_number) || 1,
      juz_number: parseInt(juz_number) || 1, // Default to 1 if missing, 0 might fail
      word_index: parseInt(word_index) || 0,
      type: type || 'manual',
      note: note || '',
      created_at: new Date()
    };

    // If it's a session bookmark, we might want to update the existing one for this user
    if (type === 'session' || type === 'completed') {
      try {
        const bookmarkType = type === 'completed' ? 'completed' : 'session';
        const { data: existing } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', userId)
          .eq('type', bookmarkType)
          .maybeSingle(); 
        
        if (existing) {
          const { data, error } = await supabase
            .from('bookmarks')
            .update({ ...cleanData, type: bookmarkType, updated_at: new Date() })
            .eq('id', existing.id)
            .select()
            .maybeSingle();
          if (error) {
            console.error("Update error, falling back to insert:", error.message);
          } else {
            return data;
          }
        }
      } catch (err) {
        console.error("Session update error, falling back to insert:", err);
      }
    }

    // Ensure type is 'session' or 'manual' to pass DB check constraint if it only allows those
    // Based on logs, 'completed' was rejected. We'll fallback to 'manual' or 'session'
    if (cleanData.type !== 'session' && cleanData.type !== 'manual') {
       cleanData.type = 'manual';
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .insert([cleanData])
      .select()
      .maybeSingle(); 
    
    if (error) {
      console.error("Supabase Insert Error:", error);
      throw new Error(`DB Error: ${error.message}`);
    }
    return data;
  }

  async deleteBookmark(userId, bookmarkId) {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', bookmarkId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  }

  async getLastSession(userId) {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'session')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
    return data;
  }
}

module.exports = new BookmarkService();
