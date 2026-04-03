# Website Changes Log

This document summarizes all changes made to the `AB_AI` website/blog integration.

## Scope

- Dynamic blog listing on website blog page
- Category-based filtering on frontend
- Backend support for approved blogs and moderation flow
- MongoDB seeding/sync utilities
- Environment-based API/website configuration

---

## 1) Frontend Changes (`AB_AI`)

### `AB_AI/blog.html`

- Added/used dynamic blog grid target:
  - `id="blogGrid"`
- Kept category sidebar structure and category labels in place.
- Removed lock effect from blog cards (for visible approved content):
  - `class="blog-card glass-locked"` -> `class="blog-card"` for blog cards.
- Added API config + blog rendering scripts:
  - `/api/blog-api-config.js`
  - `assets/js/blog-api.js`

### `AB_AI/assets/js/blog-api.js`

- Implemented website blog page data flow:
  - Fetch blogs from backend by `websiteId`
  - Store blogs in memory (`allBlogs`)
  - Render cards dynamically
  - Re-render cards category-wise on click (in-memory filtering)
- Added robust category normalization:
  - case-insensitive matching
  - whitespace normalization
  - slug-safe fallback matching
- Added safe UI fallbacks:
  - `Loading blogs...`
  - `No approved blogs found.`
  - `Failed to load blogs.`
- Removed lock overlay from dynamically rendered approved cards.
- Added explicit flag to prevent click-handler conflicts with `main.js`:
  - `window.__BLOG_API_MANAGED = true`

### `AB_AI/assets/js/main.js`

- Adjusted delegated blog category handler to avoid conflicts when blog-api owns filtering:
  - Early return when `window.__BLOG_API_MANAGED` is set.
- Improved category comparison logic:
  - normalized text matching
  - slug-compatible fallback matching

---

## 2) Backend API Changes (`AB_AI`)

### `AB_AI/server.js`

- Added route mounts:
  - `/api/categories`
  - `/api/blogs`
  - `/api/admin/blogs`
- Added API config endpoint for frontend:
  - `GET /api/blog-api-config.js`
- Added startup env guard:
  - clear error if `MONGODB_URI` is missing.
- Wired startup seed jobs:
  - `seedBlogCategories()`
  - `seedApprovedBlogs()`

### `AB_AI/routes/categories.js`

- Added endpoint:
  - `GET /api/categories/:websiteId`
- Returns category list from `Website.categories`.

### `AB_AI/routes/blogs.js`

- Added/updated endpoints:
  - `GET /api/blogs/:websiteId` (public approved feed)
  - `GET /api/blogs/my` (employee own posts)
  - `POST /api/blogs` (employee create, multipart image)
- Upload support:
  - `multer` memory upload with MIME/type + size checks.
- Public feed sourcing updated:
  - Primary source: `published_blogs` from `MAIN_SITE_MONGODB_URI`
  - Fallback source: moderation `blogs` collection
  - Supports `websiteId` as both string and `ObjectId`
- Response includes category/title/description/image/date for cards.

### `AB_AI/routes/adminBlogs.js`

- Added moderation/admin endpoints:
  - `GET /api/admin/blogs/:websiteId`
  - `PUT /api/admin/blogs/approve/:id`
  - `PUT /api/admin/blogs/reject/:id`
- On approve:
  - optional upsert into secondary DB `published_blogs`
  - audit logging entry.

---

## 3) Data Models Added/Updated (`AB_AI/models`)

### Added

- `Website.js`
  - `websiteId`, `name`, `categories[{name, slug}]`
- `Blog.js`
  - blog metadata + category object + status + author fields
  - image metadata
  - indexes for feed queries
  - TTL index on `createdAt` (7 days)
- `AuditLog.js`
  - moderation/admin action tracking

### Updated

- `User.js`
  - added optional `websiteId` for multi-tenant association.

---

## 4) Middleware Added (`AB_AI/middleware`)

- `auth.js`
  - JWT auth middleware
  - role checks (`requireAdmin`, `requireEmployee`)
  - active account enforcement

---

## 5) Utilities / Scripts

### `AB_AI/utils/seedBlogCategories.js`

- Seeds category set for website.
- Added graceful handling for duplicate index conflict (`websites.domain` unique with null case).

### `AB_AI/utils/seedApprovedBlogs.js`

- Seeds sample approved blogs for initial display/testing.

### `AB_AI/scripts/syncPublishedToBlogs.js`

- One-time utility script:
  - syncs `published_blogs` rows into moderation `blogs`.

---

## 6) Environment / Config Updates

### `AB_AI/.env.example`

- Added/updated keys:
  - `BLOG_API_BASE_URL`
  - `BLOG_WEBSITE_ID`
  - `SEED_BLOG_CATEGORIES`
  - `SEED_BLOGS`
  - `MAIN_SITE_MONGODB_URI`

### Runtime behavior

- Website blog page reads `BLOG_WEBSITE_ID` and queries:
  - `/api/blogs/:websiteId`
- For correct tenant feed, `BLOG_WEBSITE_ID` must match target website rows in DB.

---

## 7) Package Changes

### `AB_AI/package.json`

- Added dependency:
  - `multer`

