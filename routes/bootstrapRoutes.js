const express = require('express');
const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    res.json({
      ok: true,
      services: {
        api: true
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

module.exports = router;
