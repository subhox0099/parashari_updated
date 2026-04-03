const mongoose = require('mongoose');

const websiteSchema = new mongoose.Schema(
  {
    websiteId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: '' },
    categories: [
      {
        name: { type: String, required: true },
        slug: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Website', websiteSchema);

