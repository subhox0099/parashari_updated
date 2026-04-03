const Blog = require('../models/Blog');

async function seedApprovedBlogs() {
  const websiteId = process.env.BLOG_WEBSITE_ID || 'default-website';
  const shouldSeed = String(process.env.SEED_BLOGS || 'true').toLowerCase() === 'true';
  if (!shouldSeed) return;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recent = await Blog.findOne({ websiteId, status: 'APPROVED', createdAt: { $gt: weekAgo } }).lean();
  if (recent) return; // idempotent: only seed if we already have fresh samples

  // Seed data based on current `AB_AI/blog.html` cards.
  // Replace/add real editor/admin content through DB later.
  const nowSeed = new Date();
  const blogs = [
    {
      title: 'Mangal Dosha: Myths, Reality, and Effective Remedies',
      description: 'Explore what Mangal Dosha is, the common myths around it, and practical remedy approaches guided by classical principles.',
      imageUrl: 'assets/images-optimized/vedic-astrology.webp',
      category: { name: 'Vedic Astrology', slug: 'vedic-astrology' },
    },
    {
      title: '10 Essential Vastu Tips for Prosperity and Peace in Your Home',
      description: 'Practical Vastu Shastra tips to support stability, harmony, and positive energy flow in your living space.',
      imageUrl: 'assets/images-optimized/taurus-card.webp',
      category: { name: 'Vastu Shastra', slug: 'vastu-shastra' },
    },
    {
      title: 'Lal Kitab Remedies for Financial Stability and Career Growth',
      description: 'Learn Lal Kitab remedies focused on practical, easily applied solutions for financial steadiness and career progress.',
      imageUrl: 'assets/images-optimized/gemini-card.webp',
      category: { name: 'Lal Kitab Remedies', slug: 'lal-kitab-remedies' },
    },
    {
      title: 'Calculate Your Life Path Number: Unlocking Your True Potential',
      description: 'Discover how to calculate life path number and use numerology insights for clarity, confidence, and growth.',
      imageUrl: 'assets/images-optimized/cancer-card.webp',
      category: { name: 'Numerology', slug: 'numerology' },
    },
    {
      title: 'Introduction to KP Astrology: How It Differs From Traditional Vedic',
      description: 'Understand the foundations of KP Astrology and how it differs from traditional approaches while supporting accurate predictions.',
      imageUrl: 'assets/images-optimized/leo-card.webp',
      category: { name: 'KP Astrology', slug: 'kp-astrology' },
    },
    {
      title: 'From Enthusiast to Professional: Rahul’s Journey with Parashari',
      description: 'A student success story that highlights learning milestones, confidence-building, and real outcomes from the Parashari journey.',
      imageUrl: 'assets/images-optimized/virgo-card.webp',
      category: { name: 'Student Success Stories', slug: 'student-success-stories' },
    },
  ];

  await Promise.all(
    blogs.map(async (b, idx) => {
      const doc = new Blog({
        websiteId,
        title: b.title,
        description: b.description,
        imageUrl: b.imageUrl,
        category: b.category,
        status: 'APPROVED',
        createdAt: new Date(nowSeed.getTime() - idx * 24 * 60 * 60 * 1000),
      });

      await doc.save();
    })
  );
}

module.exports = { seedApprovedBlogs };

