(function () {
  let allBlogs = [];

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizeCategory(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function toSlug(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function getBase() {
    const raw = (window.BLOG_API_BASE_URL || '').trim();
    if (!raw) return '';
    return raw.replace(/\/$/, '');
  }

  function getWebsiteId() {
    return String(window.BLOG_WEBSITE_ID || 'default-website').trim();
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Request failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  function renderCategoriesIntoList(listEl, categories) {
    if (!listEl) return;

    const latestLi = document.createElement('li');
    latestLi.className = 'blog-category-item';
    latestLi.innerHTML = `
      <a href="javascript:void(0)" class="blog-category-link active" data-filter="all">
        Latest Articles <i class="fas fa-chevron-right"></i>
      </a>
    `;

    listEl.innerHTML = '';
    listEl.appendChild(latestLi);

    (categories || []).forEach((cat) => {
      if (!cat?.name) return;

      const li = document.createElement('li');
      li.className = 'blog-category-item';
      li.innerHTML = `
        <a href="javascript:void(0)" class="blog-category-link" data-filter="${escapeHtml(cat.name)}">
          ${escapeHtml(cat.name)} <i class="fas fa-chevron-right"></i>
        </a>
      `;
      listEl.appendChild(li);
    });
  }

  function renderBlogCards(gridEl, blogs) {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    if (!blogs || blogs.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
          No approved blogs found.
        </div>
      `;
      return;
    }

    const frag = document.createDocumentFragment();
    (blogs || []).forEach((blog) => {
      const categoryName = blog?.category?.name || '';
      if (!categoryName) return;

      const title = blog.title || '';
      const description = blog.description || '';
      const imageUrl = blog.imageUrl || 'assets/images-optimized/blog-og-image.webp';
      const createdAt = formatDate(blog.createdAt);
      const categorySlug = blog?.category?.slug || toSlug(categoryName);

      const article = document.createElement('article');
      // Dynamic approved blogs should NOT be locked; show full content.
      article.className = 'blog-card';
      article.setAttribute('data-category', normalizeCategory(categoryName));
      article.setAttribute('data-category-name', normalizeCategory(categoryName));
      article.setAttribute('data-category-slug', toSlug(categorySlug));
      article.innerHTML = `
        <div class="blog-card-img-wrapper">
          <img
            src="${escapeHtml(imageUrl)}"
            alt="${escapeHtml(title)}"
            class="blog-card-img"
            loading="lazy"
          />
        </div>
        <div class="blog-card-content">
          <div class="blog-card-meta">${escapeHtml(String(categoryName).toUpperCase())}</div>
          <h3 class="blog-card-title">
            <a href="javascript:void(0)">${escapeHtml(title)}</a>
          </h3>
          <p>${escapeHtml(description)}</p>
          <div class="blog-card-bottom">
            <span class="blog-card-date">${escapeHtml(createdAt)}</span>
          </div>
        </div>
      `;
      frag.appendChild(article);
    });

    gridEl.appendChild(frag);
  }

  function renderByCategory(filterValue) {
    const gridEl = document.getElementById('blogGrid');
    if (!gridEl) return;

    const selected = normalizeCategory(filterValue);
    const selectedSlug = toSlug(selected);

    if (selected === 'all') {
      renderBlogCards(gridEl, allBlogs);
      return;
    }

    const filtered = allBlogs.filter((blog) => {
      const name = normalizeCategory(blog?.category?.name || '');
      const slug = toSlug(blog?.category?.slug || toSlug(blog?.category?.name || ''));
      return selected === name || selectedSlug === slug;
    });

    renderBlogCards(gridEl, filtered);
  }

  function setLoadingState(gridEl) {
    if (!gridEl) return;
    gridEl.innerHTML = `
      <div class="blog-grid-loader" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
        Loading blogs...
      </div>
    `;
  }

  function setupCategoryFiltering() {
    const blogCategoryToggle = document.getElementById('blogCategoryToggle');
    const blogCategoryList = document.getElementById('blogCategoryList');
    const blogCategoryActiveText = document.getElementById('blogCategoryActiveText');
    const links = Array.from(document.querySelectorAll('.blog-category-link'));
    if (links.length === 0) return;

    links.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const selected = normalizeCategory(link.getAttribute('data-filter'));

        // Keep mobile + desktop links in sync
        links.forEach((l) => l.classList.remove('active'));
        links
          .filter((l) => normalizeCategory(l.getAttribute('data-filter')) === selected)
          .forEach((l) => l.classList.add('active'));

        if (blogCategoryActiveText) {
          const label = (link.textContent || '').replace(/\s+/g, ' ').trim();
          blogCategoryActiveText.textContent = label || 'Latest Articles';
        }

        if (
          window.innerWidth <= 992 &&
          blogCategoryList &&
          blogCategoryList.classList.contains('show')
        ) {
          blogCategoryList.classList.remove('show');
          if (blogCategoryToggle) blogCategoryToggle.classList.remove('active');
        }

        renderByCategory(selected);
      });
    });
  }

  async function init() {
    // Tell main.js to skip blog category delegated handling.
    window.__BLOG_API_MANAGED = true;

    const baseUrl = getBase();
    const websiteId = getWebsiteId();

    const gridEl = document.getElementById('blogGrid');

    if (gridEl) setLoadingState(gridEl);

    if (!websiteId) {
      console.warn('Missing `BLOG_WEBSITE_ID`. Cannot load blog categories/blogs.');
      if (gridEl) renderBlogCards(gridEl, []);
      return;
    }

    const blogsUrl = `${baseUrl}/api/blogs/${encodeURIComponent(websiteId)}`;

    // Fetch blogs once on load; category UI remains static in HTML.
    const blogsRes = await fetchJson(blogsUrl);
    const blogs = Array.isArray(blogsRes) ? blogsRes : (blogsRes?.items || []);
    allBlogs = blogs;

    // Initial render is "Latest Articles" (all, already sorted by API).
    renderByCategory('all');
    // Make category filtering independent and reliable.
    setupCategoryFiltering();
  }

  // Script is loaded at the end of `blog.html`, so DOM is already mostly ready.
  // Still, guard with DOMContentLoaded to be safe.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init().catch((err) => {
      console.error('blog-api init failed:', err);
      const gridEl = document.getElementById('blogGrid');
      if (gridEl) {
        gridEl.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #a00;">
            Failed to load blogs.
          </div>
        `;
      }
    });
  }
})();

