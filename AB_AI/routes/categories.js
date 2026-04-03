const express = require('express');
const Website = require('../models/Website');

const router = express.Router();

// GET /api/categories/:websiteId
router.get('/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;

    const website = await Website.findOne({ websiteId }).select('categories');
    const categories = website?.categories ?? [];

    res.json(
      categories.map((c) => ({
        name: c.name,
        slug: c.slug,
      }))
    );
  } catch (err) {
    console.error('GET /api/categories/:websiteId failed:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;

