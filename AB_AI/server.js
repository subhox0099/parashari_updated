
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const { createProxyMiddleware } = require('http-proxy-middleware');
const compression = require('compression');

const authRoutes = require('./routes/auth'); // Placeholder
const videoRoutes = require('./routes/video');
const categoriesRoutes = require('./routes/categories');
const blogsRoutes = require('./routes/blogs');
const adminBlogsRoutes = require('./routes/adminBlogs');
const { seedBlogCategories } = require('./utils/seedBlogCategories');
const { seedApprovedBlogs } = require('./utils/seedApprovedBlogs');

const app = express();

// Middleware
app.use(compression());
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://parashariindia.vercel.app',
        'https://parashariindian-learning.vercel.app',
        'https://parashariindia.com',
        'https://www.parashariindia.com'
    ],
    credentials: true
}));

// Proxy routes (MUST be before express.json and express.static)
app.use(
    '/student',
    createProxyMiddleware({
        target: 'https://parashari-welcome.vercel.app',
        changeOrigin: true,
        pathRewrite: {
            '^/student': ''
        }
    })
);

app.use(
    '/jobs',
    createProxyMiddleware({
        target: 'https://jobs-app.vercel.app',
        changeOrigin: true,
        pathRewrite: {
            '^/jobs': ''
        }
    })
);

// Regular Middleware
app.use(express.json());

// Frontend config for blog API base URL + websiteId (env-driven).
// This keeps the static frontend free from build-time tooling.
app.get('/api/blog-api-config.js', (req, res) => {
    const baseUrl = process.env.BLOG_API_BASE_URL || '';
    const websiteId = process.env.BLOG_WEBSITE_ID || 'default-website';

    res.type('application/javascript').send(`
      window.BLOG_API_BASE_URL = ${JSON.stringify(baseUrl)};
      window.BLOG_WEBSITE_ID = ${JSON.stringify(websiteId)};
    `);
});

app.use(express.static('.')); // Serve static files from root

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/blogs', blogsRoutes);
app.use('/api/admin/blogs', adminBlogsRoutes);


// Database Connection — start server ONLY after MongoDB is ready
// This prevents the race condition where the first login request hits
// before the DB connection is established, causing a 500 error.
const PORT = process.env.PORT || 3000;

if (!process.env.MONGODB_URI) {
    console.error('❌ Missing `MONGODB_URI` in `AB_AI/.env`. Please copy from .env.example and set it.');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');

        // One-time blog categories seed (idempotent).
        seedBlogCategories()
            .then(() => console.log('✅ Blog categories seed ready'))
            .catch((err) => console.error('❌ Blog categories seed failed:', err));

        // Optional approved blogs seed (idempotent).
        seedApprovedBlogs()
            .then(() => console.log('✅ Approved blogs seed ready'))
            .catch((err) => console.error('❌ Approved blogs seed failed:', err));

        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1); // Exit if DB fails — don't serve broken requests
    });
