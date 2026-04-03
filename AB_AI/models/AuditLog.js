const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    targetBlogId: { type: mongoose.Schema.Types.ObjectId, default: null },
    websiteId: { type: String, default: null },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ websiteId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

