const supabase = require('../db/supabaseClient');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without user if no token provided
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error("Auth error:", error.message);
      return next();
    }
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    next();
  }
};

module.exports = authMiddleware;
