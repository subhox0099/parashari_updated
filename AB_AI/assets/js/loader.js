/**
 * Global Loader Script
 * Handles injection of loader HTML and toggling based on page state and network requests.
 */

(function () {
    // 1. Inject Loader HTML
    const loaderHTML = `
    <div id="global-loader" class="loader-overlay">
      <div class="loader-content">
        <div class="square" id="sq1"></div>
        <div class="square" id="sq2"></div>
        <div class="square" id="sq3"></div>
        <div class="square" id="sq4"></div>
        <div class="square" id="sq5"></div>
        <div class="square" id="sq6"></div>
        <div class="square" id="sq7"></div>
        <div class="square" id="sq8"></div>
        <div class="square" id="sq9"></div>
      </div>
    </div>
  `;

    document.write(loaderHTML);

    // 2. State & Control Functions
    const loaderEl = document.getElementById('global-loader');

    if (!loaderEl) {
        console.error('Loader element not found!');
        return;
    }

    window.showLoader = function () {
        loaderEl.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    };

    window.hideLoader = function () {
        loaderEl.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    };

    // 3. Event Listeners

    // Hide on load
    window.addEventListener('load', function () {
        // Add a small delay to ensure smooth transition
        setTimeout(window.hideLoader, 500);
    });

    // Show on navigation (optional, might be too aggressive for simple links)
    // window.addEventListener('beforeunload', function() {
    //   window.showLoader();
    // });

    // 4. Network Interception (Basic)

    // XHR
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function () {
        this.addEventListener('loadstart', window.showLoader);
        this.addEventListener('loadend', window.hideLoader);
        originalOpen.apply(this, arguments);
    };

    // Fetch
    const originalFetch = window.fetch;
    window.fetch = function () {
        try {
            const url = arguments && arguments[0];
            const urlStr = typeof url === 'string' ? url : (url && url.url ? String(url.url) : '');
            const shouldSkip =
                urlStr.includes('/api/astro-ai/') ||
                urlStr.includes('generativelanguage.googleapis.com');

            if (!shouldSkip) window.showLoader();

            return originalFetch.apply(this, arguments)
            .then(res => {
                if (!shouldSkip) window.hideLoader();
                return res;
            })
            .catch(err => {
                if (!shouldSkip) window.hideLoader();
                throw err;
            });
        } catch (e) {
            // Fail open: don't block the page if detection fails
            return originalFetch.apply(this, arguments);
        }
    };

})();
