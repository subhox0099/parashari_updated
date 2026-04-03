const express = require('express');
const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const AuditLog = require('../models/AuditLog');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

const router = express.Router();

let mainSiteConn = null;
async function getMainSiteConn() {
  if (!process.env.MAIN_SITE_MONGODB_URI) return null;
  if (mainSiteConn) return mainSiteConn;

  mainSiteConn = await mongoose.createConnection(process.env.MAIN_SITE_MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  return mainSiteConn;
}

async function upsertPublishedBlog(blog) {
  const conn = await getMainSiteConn();
  if (!conn) return;

  const publishedSchema = new mongoose.Schema(
    {
      sourceBlogId: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
      websiteId: { type: String, index: true },
      category: {
        name: { type: String, default: '' },
        slug: { type: String, default: '' },
      },
      title: { type: String, required: true },
      description: { type: String, default: '' },
      content: { type: String, default: '' },
      authorName: { type: String, default: '' },
      publishDate: { type: Date, default: null },
      imageUrl: { type: String, default: '' },
    },
    { timestamps: true }
  );

  const PublishedBlog =
    conn.models.published_blogs || conn.model('published_blogs', publishedSchema, 'published_blogs');

  const doc = {
    sourceBlogId: blog._id,
    websiteId: blog.websiteId,
    category: blog.category,
    title: blog.title,
    description: blog.description,
    content: blog.content,
    authorName: blog.authorName,
    publishDate: blog.publishDate,
    imageUrl: blog.imageUrl,
  };

  await PublishedBlog.updateOne(
    { sourceBlogId: blog._id },
    { $set: doc },
    { upsert: true }
  );
}

// GET /api/admin/blogs/:websiteId
// Admin: moderation queue (default status=PENDING)
router.get('/:websiteId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const websiteId = req.params.websiteId;
    const status = req.query.status || 'PENDING';
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const query = { websiteId, status };

    const [items, total] = await Promise.all([
      Blog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('title description imageUrl category status authorName createdAt'),
      Blog.countDocuments(query),
    ]);

    res.json({ items, page, limit, total });
  } catch (err) {
    console.error('GET /api/admin/blogs/:websiteId failed:', err);
    res.status(500).json({ error: 'Failed to fetch admin blogs' });
  }
});

// PUT /api/admin/blogs/approve/:id
router.put('/approve/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog.findById(blogId);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    if (blog.status !== 'PENDING') return res.status(400).json({ message: 'Only PENDING blogs can be approved' });

    blog.status = 'APPROVED';
    await blog.save();

    await upsertPublishedBlog(blog);

    await AuditLog.create({
      actorId: req.auth.userId,
      action: 'BLOG_APPROVE',
      targetBlogId: blog._id,
      websiteId: blog.websiteId,
      meta: { title: blog.title },
    });

    res.json({ message: 'Blog approved' });
  } catch (err) {
    console.error('PUT /api/admin/blogs/approve/:id failed:', err);
    res.status(500).json({ error: 'Failed to approve blog' });
  }
});

// PUT /api/admin/blogs/reject/:id
router.put('/reject/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog.findById(blogId);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    if (blog.status !== 'PENDING') return res.status(400).json({ message: 'Only PENDING blogs can be rejected' });

    blog.status = 'REJECTED';
    await blog.save();

    await AuditLog.create({
      actorId: req.auth.userId,
      action: 'BLOG_REJECT',
      targetBlogId: blog._id,
      websiteId: blog.websiteId,
      meta: { title: blog.title },
    });

    res.json({ message: 'Blog rejected' });
  } catch (err) {
    console.error('PUT /api/admin/blogs/reject/:id failed:', err);
    res.status(500).json({ error: 'Failed to reject blog' });
  }
});

module.exports = router;

