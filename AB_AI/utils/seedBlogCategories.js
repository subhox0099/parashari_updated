const Website = require('../models/Website');

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Categories currently shown on `AB_AI/blog.html`.
const FRONTEND_CATEGORY_NAMES = [
  'Vedic Astrology',
  'Lal Kitab Remedies',
  'KP Astrology',
  'Nadi Jyotish',
  'Vastu Shastra',
  'Numerology',
  'Tarot Reading',
  'Student Success Stories',
];

async function seedBlogCategories() {
  const websiteId = process.env.BLOG_WEBSITE_ID || 'default-website';
  const shouldSeed = String(process.env.SEED_BLOG_CATEGORIES || 'true').toLowerCase() === 'true';

  if (!shouldSeed) return;

  const website = await Website.findOne({ websiteId });

  // If we already have categories, do not seed again.
  if (website?.categories?.length) return;

  const categoriesToInsert = FRONTEND_CATEGORY_NAMES.map((name) => ({
    name,
    slug: slugify(name),
  }));

  if (!website) {
    try {
      await Website.create({
        websiteId,
        name: 'Parashari Website',
        categories: categoriesToInsert,
      });
      return;
    } catch (err) {
      // Some existing databases already enforce a unique `domain` index
      // on `websites`. Our lightweight seed schema does not set domain,
      // which can trigger duplicate-null errors. Skip gracefully.
      const isDuplicateDomainNull =
        err &&
        err.code === 11000 &&
        err.keyPattern &&
        err.keyPattern.domain === 1;

      if (isDuplicateDomainNull) {
        console.warn(
          '⚠️ Skipping category seed create: existing unique `websites.domain` index rejected null domain.'
        );
        return;
      }

      throw err;
    }
  }

  // Merge missing categories only (avoid duplicates).
  const existingSlugs = new Set((website.categories || []).map((c) => c.slug));
  const merged = [
    ...(website.categories || []),
    ...categoriesToInsert.filter((c) => !existingSlugs.has(c.slug)),
  ];

  website.categories = merged;
  await website.save();
}

module.exports = { seedBlogCategories };

