const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    websiteId: { type: String, required: true, index: true },

    title: { type: String, required: true },

    description: { type: String, default: '' },

    // Optional full content (for editor-created posts).
    // Keep as plain text for now; if you add rich HTML, sanitize it before saving.
    content: { type: String, default: '' },

    imageUrl: { type: String, default: '' },

    // For uploads: store image bytes + mime.
    // `imageUrl` is what we return to public website consumers.
    image: {
      data: { type: Buffer, select: false },
      contentType: { type: String, default: '' },
    },

    category: {
      name: { type: String, default: '' },
      slug: { type: String, default: '' },
    },

    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '' },
    publishDate: { type: Date, default: null },

    // Admin sets this when approving.
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
  },
  { timestamps: true }
);

// 7-day TTL for moderation collection (pending/approved/rejected).
// For main-site persistence, mirror into a secondary DB collection on approve.
blogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

blogSchema.index({ websiteId: 1, status: 1, createdAt: -1 });
blogSchema.index({ websiteId: 1, 'category.slug': 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Blog', blogSchema);

