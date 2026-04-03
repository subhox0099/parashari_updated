const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const Website = require('../models/Website');
const { authMiddleware, requireEmployee } = require('../middleware/auth');

const router = express.Router();
let mainSiteConn = null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, cb) => {
    const okTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!okTypes.includes(file.mimetype)) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

function stripHtml(input) {
  return String(input ?? '').replace(/<[^>]*>/g, '').trim();
}

async function getMainSiteConn() {
  if (!process.env.MAIN_SITE_MONGODB_URI) return null;
  if (mainSiteConn) return mainSiteConn;
  mainSiteConn = await mongoose.createConnection(process.env.MAIN_SITE_MONGODB_URI).asPromise();
  return mainSiteConn;
}

// GET /api/blogs/my
// Employee: lists own moderation posts (optional query: status, page, limit)
router.get('/my', authMiddleware, requireEmployee, async (req, res) => {
  try {
    const websiteId = req.auth.websiteId;
    const authorId = req.auth.userId;

    const status = req.query.status; // PENDING|APPROVED|REJECTED
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const query = {
      websiteId,
      authorId,
    };
    if (status) query.status = status;

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('title description imageUrl category status createdAt'),
      Blog.countDocuments(query),
    ]);

    res.json({
      items: blogs.map((b) => ({
        id: b._id,
        title: b.title,
        description: b.description,
        imageUrl: b.imageUrl,
        category: { name: b.category?.name ?? '', slug: b.category?.slug ?? '' },
        status: b.status,
        createdAt: b.createdAt,
      })),
      page,
      limit,
      total,
    });
  } catch (err) {
    console.error('GET /api/blogs/my failed:', err);
    res.status(500).json({ error: 'Failed to fetch my blogs' });
  }
});

// POST /api/blogs
// Employee: creates a PENDING blog (multipart/form-data with `image`)
router.post('/', authMiddleware, requireEmployee, upload.single('image'), async (req, res) => {
  try {
    const websiteId = req.auth.websiteId;
    const authorObjectId = req.auth.userId;

    const {
      title,
      description,
      content,
      authorName,
      publishDate,
      categorySlug,
    } = req.body || {};

    if (!title) return res.status(400).json({ message: 'title is required' });
    if (!categorySlug) return res.status(400).json({ message: 'categorySlug is required' });
    if (!req.file) return res.status(400).json({ message: 'image file is required' });

    const category = await Website.findOne(
      { websiteId },
      { categories: 1 }
    ).lean();

    const foundCat = (category?.categories || []).find((c) => c.slug === categorySlug);
    if (!foundCat) return res.status(400).json({ message: 'Invalid categorySlug' });

    const imageBase64 = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

    const doc = await Blog.create({
      websiteId,
      title: stripHtml(title),
      description: stripHtml(description),
      content: stripHtml(content),
      authorId: authorObjectId,
      authorName: stripHtml(authorName || req.body?.authorName || ''),
      publishDate: publishDate ? new Date(publishDate) : null,
      imageUrl,
      image: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
      category: { name: foundCat.name, slug: foundCat.slug },
      status: 'PENDING',
    });

    res.status(201).json({
      message: 'Blog submitted for moderation',
      id: doc._id,
    });
  } catch (err) {
    console.error('POST /api/blogs failed:', err);
    res.status(500).json({ error: 'Failed to create blog' });
  }
});

// GET /api/blogs/:websiteId
// Public: returns ONLY approved blogs for the website.
router.get('/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    // 1) Primary source for website feed:
    //    MAIN_SITE_MONGODB_URI -> published_blogs
    let secondaryRows = [];
    try {
      const conn = await getMainSiteConn();
      if (conn) {
        const secondaryWebsiteFilter = [{ websiteId }];
        if (mongoose.Types.ObjectId.isValid(websiteId)) {
          secondaryWebsiteFilter.push({ websiteId: new mongoose.Types.ObjectId(websiteId) });
        }

        secondaryRows = await conn
          .collection('published_blogs')
          .find({ $or: secondaryWebsiteFilter })
          .project({
            _id: 0,
            title: 1,
            description: 1,
            imageUrl: 1,
            category: 1,
            createdAt: 1,
          })
          .sort({ createdAt: -1 })
          .toArray();
      }
    } catch (err) {
      console.warn('Secondary DB read skipped:', err.message);
    }

    // 2) Fallback: moderation DB approved blogs if secondary unavailable/empty.
    let primaryAgg = [];
    if (!secondaryRows.length) {
      primaryAgg = await Blog.aggregate([
        { $match: { status: 'APPROVED' } },
        { $addFields: { websiteIdStr: { $toString: '$websiteId' } } },
        { $match: { websiteIdStr: websiteId } },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            _id: 0,
            title: 1,
            description: 1,
            imageUrl: 1,
            category: 1,
            createdAt: 1,
          },
        },
      ]);
    }

    // Use secondary as source of truth when available.
    const sourceRows = secondaryRows.length ? secondaryRows : primaryAgg;

    // Dedupe by (title + createdAt), then paginate.
    const map = new Map();
    sourceRows.forEach((row) => {
      const k = `${row.title || ''}__${new Date(row.createdAt || 0).toISOString()}`;
      if (!map.has(k)) map.set(k, row);
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    const total = merged.length;
    const blogs = merged.slice(skip, skip + limit);
    const response = {
      items: blogs.map((b) => ({
        title: b.title,
        description: b.description,
        imageUrl: b.imageUrl,
        category: {
          name: b.category?.name ?? '',
          slug: b.category?.slug ?? '',
        },
        createdAt: b.createdAt,
      })),
      page,
      limit,
      total,
    };

    if (req.query.debug === '1') {
      response.debug = {
        source: secondaryRows.length ? 'published_blogs' : 'blogs_fallback',
        primaryCount: primaryAgg.length,
        secondaryCount: secondaryRows.length,
        mergedCount: merged.length,
      };
    }

    res.json(response);
  } catch (err) {
    console.error('GET /api/blogs/:websiteId failed:', err);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

module.exports = router;

