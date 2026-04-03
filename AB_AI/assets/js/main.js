/* ============================================
   MAIN JAVASCRIPT
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  const normalizeCategory = (value) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  const toSlug = (value) =>
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  // Smooth scrolling for anchor links
  initSmoothScroll();

  // Initialize lazy loading for images
  initLazyLoading();

  // Scroll animations
  initScrollAnimations();

  // Tab functionality
  initTabs();

  // Accordion functionality
  initAccordion();

  // Number Counter Animation
  initCounterAnimation();
});

// ============ SMOOTH SCROLLING ============
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#' && document.querySelector(href)) {
        e.preventDefault();
        const targetElement = document.querySelector(href);
        const offset = 80; // Adjust based on sticky header height
        const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// ============ LAZY LOADING ============
function initLazyLoading() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
    });
  }
}

// ============ SCROLL ANIMATIONS ============
function initScrollAnimations() {
  if ('IntersectionObserver' in window) {
    const elementObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          elementObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('[data-animate]').forEach(element => {
      elementObserver.observe(element);
    });
  }
}

// ============ TABS ============
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', function () {
      const tabId = this.getAttribute('data-tab');

      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      // Add active class to clicked button and corresponding pane
      this.classList.add('active');
      const activePane = document.querySelector(`#${tabId}`);
      if (activePane) {
        activePane.classList.add('active');
      }
    });
  });
}

// ============ ACCORDION ============
function initAccordion() {
  const accordionItems = document.querySelectorAll('.accordion-item');

  accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    const content = item.querySelector('.accordion-content');

    if (header) {
      header.addEventListener('click', function () {
        // Close other accordion items
        accordionItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherContent = otherItem.querySelector('.accordion-content');
            if (otherContent) {
              otherContent.style.maxHeight = null;
            }
          }
        });

        // Toggle current accordion item
        item.classList.toggle('active');

        if (item.classList.contains('active')) {
          content.style.maxHeight = content.scrollHeight + 'px';
        } else {
          content.style.maxHeight = null;
        }
      });
    }
  });
}

// ============ COUNTER ANIMATION ============
function initCounterAnimation() {
  const counters = document.querySelectorAll('.count-up');

  if (!counters.length) return;

  const observerOptions = {
    threshold: 0.5 // Start animation when 50% of the element is visible
  };

  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target); // Only animate once
      }
    });
  }, observerOptions);

  counters.forEach(counter => {
    counterObserver.observe(counter);
  });
}

function animateCounter(counter) {
  const target = +counter.getAttribute('data-target');
  const duration = 2000; // Total animation time (2 seconds)
  const steps = 60; // Total frames assuming roughly 30fps
  const increment = target / steps;
  let current = 0;

  // Safely extract optional suffix from data attribute
  const suffix = counter.getAttribute('data-suffix') || '';

  const updateCounter = setInterval(() => {
    current += increment;
    if (current >= target) {
      clearInterval(updateCounter);
      current = target; // Ensure exact final value
    }

    // Format large numbers with commas and add the suffix
    counter.innerText = Math.floor(current).toLocaleString('en-US') + suffix;
  }, duration / steps);
}

// ============ UTILITY FUNCTIONS ============

// Get query parameter from URL
function getQueryParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

// Format currency
function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// Format phone number
function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  if (!match) return phone;

  const [, p1, p2, p3] = match;
  if (p3) return `${p1} ${p2} ${p3}`;
  if (p2) return `${p1} ${p2}`;
  return p1;
}

// Debounce function
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Add CSS animation classes
const animationStyle = document.createElement('style');
animationStyle.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  [data-animate] {
    opacity: 0;
  }

  [data-animate].animate-in {
    animation: fadeInUp 0.6s ease-out forwards;
  }

  .accordion-item .accordion-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out;
  }

  .accordion-item.active .accordion-content {
    max-height: 500px;
  }

  .tab-pane {
    display: none;
  }

  .tab-pane.active {
    display: block;
  }
`;
document.head.appendChild(animationStyle);

console.log('✓ Main JavaScript initialized');

// ============ BLOG CAROUSEL ============
document.addEventListener('DOMContentLoaded', function () {
  const blogTrack = document.querySelector('.blog-carousel-track');
  if (blogTrack) {
    const slides = Array.from(blogTrack.children);
    const nextButton = document.getElementById('blogCarouselNext');
    const prevButton = document.getElementById('blogCarouselPrev');
    const dotsNav = document.getElementById('blogCarouselDots');
    const dots = Array.from(dotsNav.children);

    let currentSlideIndex = 0;
    let slideInterval;

    const moveToSlide = (track, currentSlide, targetSlide, targetIndex) => {
      if (!targetSlide) return;

      if (currentSlide) currentSlide.classList.remove('active');
      targetSlide.classList.add('active');

      // Update dots
      if (dotsNav) {
        const currentDot = dotsNav.querySelector('.active');
        if (currentDot) currentDot.classList.remove('active');
        if (dots[targetIndex]) dots[targetIndex].classList.add('active');
      }

      currentSlideIndex = targetIndex;

      // Move track based on slide width in pixels
      const slideWidth = slides[0].getBoundingClientRect().width;
      track.style.transform = `translateX(-${targetIndex * slideWidth}px)`;

      resetInterval();
    };

    // Handle window resize dynamically to prevent misalignments
    window.addEventListener('resize', () => {
      const slideWidth = slides[0].getBoundingClientRect().width;
      blogTrack.style.transform = `translateX(-${currentSlideIndex * slideWidth}px)`;
    });

    if (nextButton) {
      nextButton.addEventListener('click', e => {
        const currentSlide = blogTrack.querySelector('.active') || slides[currentSlideIndex];
        let targetIndex = currentSlideIndex + 1;
        if (targetIndex >= slides.length) targetIndex = 0; // loop back to start
        const targetSlide = slides[targetIndex];

        moveToSlide(blogTrack, currentSlide, targetSlide, targetIndex);
      });
    }

    if (prevButton) {
      prevButton.addEventListener('click', e => {
        const currentSlide = blogTrack.querySelector('.active') || slides[currentSlideIndex];
        let targetIndex = currentSlideIndex - 1;
        if (targetIndex < 0) targetIndex = slides.length - 1; // loop to end
        const targetSlide = slides[targetIndex];

        moveToSlide(blogTrack, currentSlide, targetSlide, targetIndex);
      });
    }

    if (dotsNav) {
      dotsNav.addEventListener('click', e => {
        const targetDot = e.target.closest('.pagination-dot');
        if (!targetDot) return;

        const currentSlide = blogTrack.querySelector('.active') || slides[currentSlideIndex];
        const targetIndex = dots.findIndex(dot => dot === targetDot);
        const targetSlide = slides[targetIndex];

        moveToSlide(blogTrack, currentSlide, targetSlide, targetIndex);
      });
    }

    // Auto play function
    const nextSlideTimer = () => {
      const currentSlide = blogTrack.querySelector('.active') || slides[currentSlideIndex];
      let targetIndex = currentSlideIndex + 1;
      if (targetIndex >= slides.length) targetIndex = 0;
      const targetSlide = slides[targetIndex];
      moveToSlide(blogTrack, currentSlide, targetSlide, targetIndex);
    };

    const resetInterval = () => {
      clearInterval(slideInterval);
      slideInterval = setInterval(nextSlideTimer, 2000); // 2 seconds per slide
    };

    // Start auto play
    resetInterval();

    // Pause on hover
    const carouselContainer = document.querySelector('.blog-carousel-container');
    if (carouselContainer) {
      carouselContainer.addEventListener('mouseenter', () => clearInterval(slideInterval));
      carouselContainer.addEventListener('mouseleave', resetInterval);
    }
  }

  // --- MOBILE BLOG CATEGORY TOGGLE ---
  const blogCategoryToggle = document.getElementById('blogCategoryToggle');
  const blogCategoryList = document.getElementById('blogCategoryList');
  const blogCategoryActiveText = document.getElementById('blogCategoryActiveText');

  if (blogCategoryToggle && blogCategoryList) {
    blogCategoryToggle.addEventListener('click', () => {
      blogCategoryList.classList.toggle('show');
      blogCategoryToggle.classList.toggle('active');
    });
  }

  // --- BLOG CATEGORY FILTERING LOGIC (delegated for dynamic content) ---
  document.addEventListener('click', (e) => {
    // blog-api.js owns category filtering on blog page
    if (window.__BLOG_API_MANAGED) return;

    const link = e.target.closest('.blog-category-link');
    if (!link) return;

    e.preventDefault(); // Prevent default anchor jump
    const filterValue = link.getAttribute('data-filter');
    const normalizedFilter = normalizeCategory(filterValue);
    const normalizedFilterSlug = toSlug(normalizedFilter);

    // Remove active class from all links
    document.querySelectorAll('.blog-category-link').forEach(l => l.classList.remove('active'));

    // Add active class to clicked link across all lists (mobile and desktop)
    Array.from(document.querySelectorAll('.blog-category-link'))
      .filter((l) => normalizeCategory(l.getAttribute('data-filter')) === normalizedFilter)
      .forEach((matchingLink) => matchingLink.classList.add('active'));

    // Update mobile toggle text
    if (blogCategoryActiveText) {
      const label = (link.textContent || '').replace(/\s+/g, ' ').trim();
      blogCategoryActiveText.textContent = label || 'Latest Articles';
    }

    // Close dropdown on mobile
    if (
      window.innerWidth <= 992 &&
      blogCategoryList &&
      blogCategoryList.classList.contains('show')
    ) {
      blogCategoryList.classList.remove('show');
      if (blogCategoryToggle) blogCategoryToggle.classList.remove('active');
    }

    // Filter current rendered blog cards
    document.querySelectorAll('.blog-card').forEach(card => {
      const normalizedCardCategory = normalizeCategory(
        card.getAttribute('data-category-name') || card.getAttribute('data-category')
      );
      const normalizedCardSlug = toSlug(card.getAttribute('data-category-slug') || '');

      if (
        normalizedFilter === 'all' ||
        normalizedFilter === normalizedCardCategory ||
        normalizedFilterSlug === normalizedCardSlug
      ) {
        card.style.display = 'flex';
        card.style.animation = 'none';
        card.offsetHeight; /* Trigger reflow */
        card.style.animation = 'fadeInCard 0.4s ease forwards';
      } else {
        card.style.display = 'none';
        card.style.animation = 'none';
      }
    });
  });

  // --- FREE COURSES TAB FILTERING LOGIC ---
  const freeCourseTabs = document.querySelectorAll('.free-course-tab');
  const freeCourseCards = document.querySelectorAll('.free-course-card');

  if (freeCourseTabs.length > 0 && freeCourseCards.length > 0) {
    freeCourseTabs.forEach(tab => {
      tab.addEventListener('click', function () {
        // Remove active class from all tabs
        freeCourseTabs.forEach(t => t.classList.remove('active'));

        // Add active class to clicked tab
        this.classList.add('active');

        const filterValue = this.getAttribute('data-filter');

        freeCourseCards.forEach(card => {
          const cardCategory = card.getAttribute('data-category');

          if (filterValue === 'all' || filterValue === cardCategory) {
            card.style.display = 'block';
            card.style.animation = 'none';
            card.offsetHeight; /* Trigger reflow */
            card.style.animation = 'fadeInCard 0.4s ease forwards';
          } else {
            card.style.display = 'none';
            card.style.animation = 'none';
          }
        });
      });
    });
  }
});

/* ============================================
   URL HOVER OBFUSCATION
   Hides native browser URL previews on hover
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.innerHTML = `a[data-obfuscated-href] { cursor: pointer !important; }`;
    document.head.appendChild(style);
});

document.addEventListener('mouseover', (e) => {
    const a = e.target.closest('a');
    if (a && a.href && !a.href.startsWith('javascript:')) {
        a.dataset.obfuscatedHref = a.href;
        a.removeAttribute('href');
    }
});

document.addEventListener('mouseout', (e) => {
    const a = e.target.closest('a');
    if (a && a.dataset.obfuscatedHref) {
        a.href = a.dataset.obfuscatedHref;
    }
});

document.addEventListener('mousedown', (e) => {
    const a = e.target.closest('a');
    if (a && a.dataset.obfuscatedHref) {
        // Restore href right before click so standard navigation/target=_blank works
        a.href = a.dataset.obfuscatedHref;
    }
});
