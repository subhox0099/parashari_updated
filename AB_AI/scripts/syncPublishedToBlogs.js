require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../models/Blog');

async function run() {
  const websiteId = (process.env.BLOG_WEBSITE_ID || '').trim();
  if (!websiteId) {
    throw new Error('BLOG_WEBSITE_ID is missing in .env');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in .env');
  }
  if (!process.env.MAIN_SITE_MONGODB_URI) {
    throw new Error('MAIN_SITE_MONGODB_URI is missing in .env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const mainConn = await mongoose.createConnection(process.env.MAIN_SITE_MONGODB_URI).asPromise();

  const idFilters = [{ websiteId }];
  if (mongoose.Types.ObjectId.isValid(websiteId)) {
    idFilters.push({ websiteId: new mongoose.Types.ObjectId(websiteId) });
  }

  const publishedRows = await mainConn
    .collection('published_blogs')
    .find({ $or: idFilters })
    .project({
      title: 1,
      description: 1,
      content: 1,
      imageUrl: 1,
      category: 1,
      authorName: 1,
      publishDate: 1,
      createdAt: 1,
    })
    .toArray();

  let changed = 0;
  for (const row of publishedRows) {
    const createdAt = row.createdAt ? new Date(row.createdAt) : new Date();
    const filter = {
      websiteId,
      title: row.title || '',
      createdAt,
    };
    const update = {
      $set: {
        websiteId,
        title: row.title || '',
        description: row.description || '',
        content: row.content || '',
        imageUrl: row.imageUrl || '',
        category: row.category || { name: '', slug: '' },
        authorName: row.authorName || '',
        publishDate: row.publishDate ? new Date(row.publishDate) : null,
        status: 'APPROVED',
        createdAt,
      },
    };

    const res = await Blog.updateOne(filter, update, { upsert: true });
    if (res.upsertedCount || res.modifiedCount) changed += 1;
  }

  console.log(`Published rows: ${publishedRows.length}`);
  console.log(`Synced changes: ${changed}`);

  await mainConn.close();
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

