// Initialize theme FIRST before anything else
(function initThemeImmediately() {
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Apply theme to both html and body
  if (savedTheme === "dark" || (savedTheme === null && systemPrefersDark)) {
    document.documentElement.classList.add("dark-theme");
    document.body.classList.add("dark-theme");
  } else if (savedTheme === "light") {
    document.documentElement.classList.add("light-theme");
    document.body.classList.add("light-theme");
  }
})();

// Initialize or retrieve the view state
let isEmbeddedViewVisible =
  localStorage.getItem("isEmbeddedViewVisible") === "true";

// Pagination variables
const POSTS_PER_PAGE = 5;
let currentPage = 0;
let allUrls = [];
let isLoading = false;
let hasMorePages = false;
let scrollObserver = null;
let isSearching = false;
let currentSearchQuery = '';


// Initialize IntersectionObserver for infinite scroll (best practice)
function initScrollObserver() {
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }

  const sentinel = document.getElementById('scrollSentinel');
  if (!sentinel) return;

  // Best practice: observe viewport with rootMargin
  const options = {
    root: null,
    rootMargin: '0px 0px 100px 0px',
    threshold: 0
  };

  scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && hasMorePages && !isLoading) {
        console.log('[InfiniteScroll] Loading next page');
        showLoadingIndicator();
        loadNextPage();
      }
    });
  }, options);

  scrollObserver.observe(sentinel);
}

// Simple loading indicator functions
function showLoadingIndicator() {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) {
    indicator.style.display = 'block';
    setTimeout(() => indicator.classList.add('active'), 10);
  }
}

function hideLoadingIndicator() {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) {
    indicator.classList.remove('active');
    setTimeout(() => indicator.style.display = 'none', 300);
  }
}

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (savedTheme === null && systemPrefersDark)) {
    document.body.classList.add("dark-theme");
    updateThemeIcon(true);
  } else if (savedTheme === "light") {
    document.body.classList.add("light-theme");
    updateThemeIcon(false);
  } else {
    // Use system preference
    updateThemeIcon(systemPrefersDark);
  }
}

function updateThemeIcon(isDark) {
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.textContent = isDark ? "☀️" : "🌙";
  }
}

function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.contains("dark-theme");

  if (isDark) {
    body.classList.remove("dark-theme");
    body.classList.add("light-theme");
    localStorage.setItem("theme", "light");
    updateThemeIcon(false);
  } else {
    body.classList.remove("light-theme");
    body.classList.add("dark-theme");
    localStorage.setItem("theme", "dark");
    updateThemeIcon(true);
  }

  // Refresh tweet embeds if in embedded view
  if (isEmbeddedViewVisible) {
    const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");
    if (tweetEmbedContainer) {
      // Clear tweet cache to force reload with new theme
      tweetCache = {};

      // Get all tweet URLs from the simple list
      const simpleUrlList = document.getElementById("simpleUrlList");
      if (simpleUrlList) {
        const urls = [...simpleUrlList.querySelectorAll("a")].map(link => link.href);

        // Clear and re-embed tweets with new theme
        tweetEmbedContainer.innerHTML = '';
        urls.forEach(url => embedTweet(url));
      }
    }
  }
}

// Listen for system theme changes
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  const savedTheme = localStorage.getItem("theme");
  // Only auto-switch if user hasn't manually set a preference
  if (!savedTheme) {
    if (e.matches) {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
    } else {
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
    }
    updateThemeIcon(e.matches);
  }
});

// Debug function to test Twitter oEmbed endpoints
function debugTwitterEndpoints() {
  const testUrl = "https://x.com/elonmusk/status/123456789";
  const endpoints = [
    'https://publish.twitter.com/oembed',
    'https://api.twitter.com/1.1/statuses/oembed.json',
    'https://cdn.syndication.twimg.com/widgets/tweet'
  ];

  console.log('Testing Twitter oEmbed endpoints...');

  endpoints.forEach((endpoint, index) => {
    const url = `${endpoint}?url=${encodeURIComponent(testUrl)}&omit_script=1`;
    console.log(`Testing endpoint ${index + 1}: ${endpoint}`);

    fetch(url)
      .then(response => {
        console.log(`Endpoint ${index + 1} response:`, {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          ok: response.ok
        });

        if (response.ok) {
          return response.text().then(text => {
            console.log(`Endpoint ${index + 1} content preview:`, text.substring(0, 200));
          });
        }
      })
      .catch(error => {
        console.error(`Endpoint ${index + 1} error:`, error);
      });
  });
}

// Run debug test when sidebar loads (for development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  setTimeout(debugTwitterEndpoints, 2000);
}

document.addEventListener("DOMContentLoaded", async function () {
  // Initialize database
  await tweetDB.init();
  // Initialize theme
  initTheme();

  const clearButton = document.getElementById("clearButton");
  const themeToggle = document.getElementById("themeToggle");
  const historyPageBtn = document.getElementById("historyPageBtn");
  const toggleViewButton = document.getElementById("toggleViewButton");
  const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");
  const simpleUrlList = document.getElementById("simpleUrlList");
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const clearSearchButton = document.getElementById("clearSearchButton");


  const emptyList = document.getElementById("emptyList");

  console.log("DOM fully loaded and parsed");

  // Close button removed - no longer needed in popup mode

  // Theme toggle button event listener
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // History page button event listener
  if (historyPageBtn) {
    historyPageBtn.addEventListener("click", function() {
      chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    });
  }

  // Set initial display based on the persisted state or default
  tweetEmbedContainer.style.display = isEmbeddedViewVisible ? "block" : "none";
  simpleUrlList.style.display = isEmbeddedViewVisible ? "none" : "block";
  toggleViewButton.textContent = isEmbeddedViewVisible ? "📝" : "🖼️";
  toggleViewButton.title = isEmbeddedViewVisible
    ? "Show Simple View"
    : "Show Embedded View";

  // Functions are now defined globally, no need to redefine them here

  // Fallback: Traditional scroll event listener (in case IntersectionObserver fails)
  const content = document.querySelector('.content');
  if (content) {
    let scrollTimeout;
    content.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // Check if we're near the bottom
        const scrollPosition = content.scrollTop + content.clientHeight;
        const scrollHeight = content.scrollHeight;
        const threshold = 150; // Load when within 150px of bottom

        if (scrollPosition >= scrollHeight - threshold && hasMorePages && !isLoading) {
          console.log(`[ScrollFallback] Near bottom (${scrollHeight - scrollPosition}px remaining), loading next page`);
          showLoadingIndicator();
          loadNextPage();
        }
      }, 100); // Debounce
    });
    console.log('[ScrollFallback] Traditional scroll listener attached as backup');
  }

  // Search functionality
  searchButton.addEventListener("click", performSearch);
  clearSearchButton.addEventListener("click", clearSearch);
  searchInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      performSearch();
    }
  });

  async function performSearch() {
    const query = searchInput.value.trim();
    if (query === currentSearchQuery) return;

    currentSearchQuery = query;
    isSearching = query.length > 0;

    if (isSearching) {
      clearSearchButton.style.display = 'block';
      console.log('[Search] Searching for:', query);

      // Search in IndexedDB
      const searchResults = await tweetDB.searchTweets(query);
      const searchUrls = searchResults.map(tweet => tweet.url);

      console.log(`[Search] Found ${searchUrls.length} matching tweets`);

      // Update the display with search results
      updateUrlList(searchUrls, true);
    } else {
      clearSearch();
    }
  }

  function clearSearch() {
    searchInput.value = '';
    currentSearchQuery = '';
    isSearching = false;
    clearSearchButton.style.display = 'none';

    // Reload all URLs from storage
    chrome.storage.local.get({ urls: [] }, (data) => {
      updateUrlList(data.urls, false);
    });
  }

  toggleViewButton.addEventListener("click", function () {
    // Toggle the state of isEmbeddedViewVisible
    isEmbeddedViewVisible = !isEmbeddedViewVisible;
    localStorage.setItem(
      "isEmbeddedViewVisible",
      isEmbeddedViewVisible.toString()
    );

    console.log("[ToggleView] Toggling view");
    if (isEmbeddedViewVisible) {
      console.log("[ToggleView] Showing embedded view");
      tweetEmbedContainer.style.display = "block";
      simpleUrlList.style.display = "none";
      toggleViewButton.textContent = "📝";
      toggleViewButton.title = "Show Simple View";

      // Clear embedded container and reload with pagination
      tweetEmbedContainer.innerHTML = '';
      tweetCache = {};

      // Reset pagination and load from beginning
      currentPage = 0;
      hasMorePages = allUrls.length > POSTS_PER_PAGE;

      // Update content class for embedded view styling
      const content = document.querySelector('.content');
      if (content) {
        content.className = 'content embedded-view';
      }

      // Re-initialize observer if needed
      if (hasMorePages) {
        setTimeout(() => {
          initScrollObserver();
        }, 100);
      }

      // Load first page of embedded tweets
      const pageUrls = getPaginatedUrls(allUrls, currentPage);
      console.log(`[ToggleView] Loading ${pageUrls.length} tweets for embedded view`);

      pageUrls.forEach((url, index) => {
        setTimeout(() => {
          embedTweet(url);
        }, index * 200);
      });

      currentPage++;
      hasMorePages = (currentPage * POSTS_PER_PAGE) < allUrls.length;
      console.log(`[ToggleView] After loading first page - currentPage: ${currentPage}, hasMorePages: ${hasMorePages}`);
    } else {
      console.log("[ToggleView] Showing simple view");
      tweetEmbedContainer.style.display = "none";
      simpleUrlList.style.display = "block";
      toggleViewButton.textContent = "🖼️";
      toggleViewButton.title = "Show Embedded View";

      // Update content class for simple view styling
      const content = document.querySelector('.content');
      if (content) {
        content.className = 'content simple-view';
      }
    }
  });

  // Close button handler removed - popup closes automatically
});

function loadTwitterScript(attempts = 3) {
  return new Promise((resolve, reject) => {
    if (attempts <= 0) {
      reject(
        new Error("Failed to load Twitter Widgets JS after several attempts")
      );
      return;
    }

    // Check if already loaded
    if (window.twttr && window.twttr.widgets) {
      console.log("Twitter Widgets already available.");
      resolve();
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="widgets.js"]')) {
      console.log("Twitter Widgets script already loading, waiting...");
      // Wait for the existing script to load
      const checkInterval = setInterval(() => {
        if (window.twttr && window.twttr.widgets) {
          clearInterval(checkInterval);
          console.log("Twitter Widgets loaded from existing script.");
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("Timeout waiting for existing script to load"));
      }, 10000);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = () => {
      console.log("Twitter Widgets JS loaded successfully.");
      resolve();
    };
    script.onerror = () => {
      console.error("Failed to load Twitter Widgets JS, retrying...");
      // Remove the failed script
      script.remove();
      // Retry with exponential backoff
      setTimeout(() => {
        loadTwitterScript(attempts - 1)
          .then(resolve)
          .catch(reject);
      }, Math.pow(2, 3 - attempts) * 1000); // Exponential backoff: 1s, 2s, 4s
    };
    document.head.appendChild(script);
  });
}

// Initialize Twitter widgets loading promise
let twitterWidgetsLoaded = new Promise((resolve, reject) => {
  if (window.twttr && window.twttr.widgets) {
    console.log("Twitter Widgets already available.");
    resolve();
  } else {
    loadTwitterScript(3).then(resolve).catch(reject);
  }
});

// Cache for storing tweet HTML content
let tweetCache = {};

// Function to get paginated URLs
function getPaginatedUrls(urls, page) {
  const startIndex = page * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  console.log(`[Pagination] Fetching page ${page + 1}, posts ${startIndex + 1}-${Math.min(endIndex, urls.length)} of ${urls.length}`);
  return urls.slice(startIndex, endIndex);
}

// Function to check if there are more pages
function checkHasMorePages(urls, currentPage) {
  return (currentPage + 1) * POSTS_PER_PAGE < urls.length;
}

async function embedTweet(url) {
  const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");

  // Check if tweet is cached in IndexedDB
  const cachedTweet = await tweetDB.getTweet(url);
  if (cachedTweet && cachedTweet.html) {
    console.log('[Cache] Using cached tweet for:', url);
    const tweetDiv = document.createElement("div");
    tweetDiv.innerHTML = cachedTweet.html;
    tweetDiv.style.height = "0";
    tweetDiv.style.overflow = "hidden";
    tweetEmbedContainer.appendChild(tweetDiv);

    // Load Twitter widgets
    twitterWidgetsLoaded.then(() => {
      if (window.twttr && window.twttr.widgets) {
        twttr.widgets.load(tweetDiv).then(() => {
          tweetDiv.style.height = "";
          tweetDiv.style.overflow = "";
          tweetDiv.className = "tweet-embed-new";
          setTimeout(() => {
            tweetDiv.classList.remove("tweet-embed-new");
          }, 1000);
        });
      }
    });
    return;
  }

  // Try multiple Twitter oEmbed endpoints
  const tryOEmbedEndpoint = (endpoint) => {
    const isDarkMode = document.body.classList.contains("dark-theme");
    const theme = isDarkMode ? "dark" : "light";
    return fetch(
      `${endpoint}?url=${encodeURIComponent(url)}&omit_script=1&hide_thread=true&theme=${theme}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return response.text().then(text => {
            console.error('Response is not JSON:', text.substring(0, 200));
            throw new Error('Response is not JSON');
          });
        }
        return response.json();
      });
  };

  // Try different endpoints in order
  const endpoints = [
    'https://publish.twitter.com/oembed',
    'https://api.twitter.com/1.1/statuses/oembed.json',
    'https://cdn.syndication.twimg.com/widgets/tweet'
  ];

  let currentEndpointIndex = 0;

  const tryNextEndpoint = () => {
    if (currentEndpointIndex >= endpoints.length) {
      throw new Error('All Twitter oEmbed endpoints failed');
    }

    const endpoint = endpoints[currentEndpointIndex];
    console.log(`Trying Twitter oEmbed endpoint: ${endpoint}`);

    return tryOEmbedEndpoint(endpoint)
      .catch((error) => {
        console.error(`Failed with endpoint ${endpoint}:`, error);
        currentEndpointIndex++;
        if (currentEndpointIndex < endpoints.length) {
          return tryNextEndpoint();
        }
        throw error;
      });
  };

  tryNextEndpoint()
    .then(async (data) => {
      console.log('Twitter oEmbed response:', data);

      if (data.html) {
        // Save to IndexedDB
        await tweetDB.saveTweet({
          url: url,
          html: data.html,
          authorName: data.author_name,
          authorUrl: data.author_url,
          providerName: data.provider_name,
          providerUrl: data.provider_url,
          type: data.type,
          width: data.width,
          height: data.height,
          version: data.version,
          cacheControl: data.cache_age
        });

        const tweetDiv = document.createElement("div");
        tweetDiv.innerHTML = data.html;
        tweetDiv.style.height = "0"; // Initially set height to 0 to prevent layout shift
        tweetDiv.style.overflow = "hidden"; // Prevent content from spilling out

        // Append tweet to container
        tweetEmbedContainer.appendChild(tweetDiv);

        // Ensure Twitter widgets are loaded before trying to use them
        twitterWidgetsLoaded.then(() => {
          if (window.twttr && window.twttr.widgets) {
            twttr.widgets.load(tweetDiv).then(() => {
              tweetDiv.style.height = ""; // Restore the height
              tweetDiv.style.overflow = ""; // Restore overflow behavior
              tweetDiv.className = "tweet-embed-new"; // Apply animation class after loading
              tweetCache[url] = tweetDiv.innerHTML; // Cache the fully rendered HTML content
              console.log("Tweet embedded and UI loaded for URL:", url);

              // Remove the animation class after the animation duration
              setTimeout(() => {
                tweetDiv.classList.remove("tweet-embed-new");
              }, 1000);

              // Tweet loaded successfully
            }).catch((error) => {
              console.error("Error loading tweet widget:", error);
            });
          } else {
            console.error("Twitter widgets not available");
          }
        }).catch((error) => {
          console.error("Error loading Twitter widgets:", error);
        });
      } else {
        console.error("No HTML content in oEmbed response:", data);
      }
    })
    .catch((error) => {
      console.error("Error embedding tweet:", error);

      // Fallback: create a simple link instead of embedded tweet
      const fallbackDiv = document.createElement("div");
      fallbackDiv.className = "tweet-fallback";
      fallbackDiv.innerHTML = `
        <div style="padding: 15px; border: 1px solid #ccc; border-radius: 8px; margin: 10px 0;">
          <p style="margin: 0 0 10px 0; color: #666;">Tweet preview unavailable</p>
          <a href="${url}" target="_blank" style="color: #1da1f2; text-decoration: none; word-break: break-all;">
            ${url}
          </a>
        </div>
      `;

      // Append fallback to container
      tweetEmbedContainer.appendChild(fallbackDiv);
    });
}

function updateUrlList(urls, isFromSearch = false) {
  const simpleUrlList = document.getElementById("simpleUrlList");
  const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");
  const toggleViewButton = document.getElementById("toggleViewButton");
  const searchResultsInfo = document.getElementById("searchResultsInfo");

  console.log('========================================');
  console.log(`[UpdateUrlList] Called with ${urls.length} total URLs${isFromSearch ? ' from search' : ''}`);
  console.log('[UpdateUrlList] First 5 URLs received:', urls.slice(0, 5));
  console.log('[UpdateUrlList] Timestamp:', new Date().toISOString());
  console.log('========================================');

  // Store all URLs for pagination
  allUrls = urls;
  currentPage = 0; // Reset to first page
  hasMorePages = urls.length > 0; // Initially true if we have any URLs

  // Update search results info
  if (isFromSearch && currentSearchQuery) {
    searchResultsInfo.innerHTML = `Found <strong>${urls.length}</strong> posts matching "<strong>${currentSearchQuery}</strong>"`;
    searchResultsInfo.classList.add('active');
  } else {
    searchResultsInfo.classList.remove('active');
  }

  // Update visibility based on isEmbeddedViewVisible
  tweetEmbedContainer.style.display = isEmbeddedViewVisible ? "block" : "none";
  simpleUrlList.style.display = isEmbeddedViewVisible ? "none" : "block";
  toggleViewButton.textContent = isEmbeddedViewVisible
    ? "Show Simple View"
    : "Show Embedded View";

  if (urls.length === 0) {
    emptyList.style.display = "block";
    tweetEmbedContainer.style.display = "none";
    simpleUrlList.style.display = "none";
    toggleViewButton.style.display = "none";
    clearButton.style.display = "none";
  } else {
    if (isEmbeddedViewVisible) {
      tweetEmbedContainer.style.display = "block";
    } else {
      simpleUrlList.style.display = "block";
    }
    emptyList.style.display = "none";
    toggleViewButton.style.display = "block";
    clearButton.style.display = "block";

    // Clear existing content for fresh pagination (removing any existing loaders)
    simpleUrlList.innerHTML = '';
    tweetEmbedContainer.innerHTML = '';

    // Load first page
    loadNextPage();

    // Check if there will be more pages
    const willHaveMore = urls.length > POSTS_PER_PAGE;
    const scrollTrigger = document.getElementById("scrollTrigger");

    // Update content class for styling
    const content = document.querySelector('.content');
    if (content) {
      content.className = 'content ' + (isEmbeddedViewVisible ? 'embedded-view' : 'simple-view');
    }

    if (scrollTrigger) {
      scrollTrigger.style.display = willHaveMore ? 'block' : 'none';
    }

    // Keep loading indicator hidden initially
    const loadingIndicator = document.getElementById("loadingIndicator");
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
      loadingIndicator.classList.remove('active');
    }

    if (willHaveMore) {
      // Initialize observer after showing trigger
      setTimeout(() => {
        initScrollObserver();
      }, 100);
    }
  }
}

function loadNextPage() {
  if (isLoading) {
    console.log(`[LoadNextPage] Skipping - already loading`);
    return;
  }

  // Check if we actually have more pages to load
  if (currentPage * POSTS_PER_PAGE >= allUrls.length) {
    console.log(`[LoadNextPage] No more pages to load. Current page: ${currentPage}, Total URLs: ${allUrls.length}`);
    hasMorePages = false;
    return;
  }

  isLoading = true;
  const loadingPageNumber = currentPage + 1; // Store the actual page number being loaded
  console.log(`[LoadNextPage] Loading page ${loadingPageNumber} of ${Math.ceil(allUrls.length / POSTS_PER_PAGE)}`);

  const simpleUrlList = document.getElementById("simpleUrlList");
  const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");

  // Get URLs for current page
  const pageUrls = getPaginatedUrls(allUrls, currentPage);

  // Show loading skeleton
  if (isEmbeddedViewVisible) {
    showLoadingSkeleton();
  }

  // Process URLs for the current page
  pageUrls.forEach((url, index) => {
    // Add to simple list (insert before bottom loader if it exists)
    const link = document.createElement("a");
    link.href = url;
    link.textContent = url;
    link.className = "url-link";
    link.target = "_blank";
    link.classList.add("url-link-new");

    simpleUrlList.appendChild(link);

    setTimeout(() => {
      link.classList.remove("url-link-new");
    }, 1000);

    // Add to embedded view if visible
    if (isEmbeddedViewVisible) {
      // Add slight delay between embeds to prevent overwhelming the API
      setTimeout(() => {
        embedTweet(url);

        // Hide loading skeleton after last item of the page
        if (index === pageUrls.length - 1) {
          setTimeout(() => {
            hideLoadingSkeleton();
            hideLoadingIndicator();
            // Add a small delay before allowing next load to prevent rapid consecutive loads
            setTimeout(() => {
              isLoading = false;
              console.log(`[LoadNextPage] Page ${loadingPageNumber} loaded successfully`);
            }, 300);
          }, 500);
        }
      }, index * 200);
    }
  });

  // If not in embedded view, immediately mark as not loading
  if (!isEmbeddedViewVisible) {
    isLoading = false;
    console.log(`[LoadNextPage] Page ${loadingPageNumber} loaded successfully (simple view)`);
  }

  // Move to next page
  currentPage++;
  hasMorePages = (currentPage * POSTS_PER_PAGE) < allUrls.length;

  console.log(`[LoadNextPage] Ready for next page. Current page index: ${currentPage}, hasMorePages: ${hasMorePages}, Total pages: ${Math.ceil(allUrls.length / POSTS_PER_PAGE)}`);

  // Hide loading indicator after loading completes
  if (!isLoading) {
    hideLoadingIndicator();
  }
}

function showLoadingSkeleton() {
  const container = document.getElementById("tweetEmbedContainer");
  const loadingDiv = document.createElement("div");
  loadingDiv.id = "paginationLoadingSkeleton";
  loadingDiv.className = "pagination-loading";
  loadingDiv.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;
  container.appendChild(loadingDiv);
  console.log("[LoadingSkeleton] Showing loading skeleton");
}

function hideLoadingSkeleton() {
  const skeleton = document.getElementById("paginationLoadingSkeleton");
  if (skeleton) {
    skeleton.remove();
    console.log("[LoadingSkeleton] Hiding loading skeleton");
  }
}

chrome.storage.local.get({ urls: [] }, async (data) => {
  console.log('========================================');
  console.log('[POPUP OPENED] Loading posts from storage');
  console.log(`[POPUP] Total posts: ${data.urls.length}`);
  console.log('[POPUP] First 5 posts:', data.urls.slice(0, 5));
  console.log('[POPUP] Timestamp:', new Date().toISOString());
  console.log('========================================');

  // Ensure URLs are in the correct order (most recent first)
  // This handles the case where the storage might not be fully updated yet
  updateUrlList(data.urls);

  // Pre-fetch tweets for caching if not already cached
  for (const url of data.urls) {
    const cached = await tweetDB.getTweet(url);
    if (!cached) {
      // Fetch and cache in the background
      console.log('[Cache] Pre-fetching tweet for caching:', url);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateUrlList") {
    // Simply update the list with the new order
    updateUrlList(message.urls);
  }
});

clearButton.addEventListener("click", async function () {
  if (
    confirm(
      "Are you sure you want to clear all URLs? This action cannot be undone."
    )
  ) {
    // Clear IndexedDB
    await tweetDB.clearAll();

    chrome.storage.local.set({ urls: [] }, () => {
      console.log("[Clear] Clearing all URLs and resetting pagination");

      // Clear the simple URL list
      const simpleUrlList = document.getElementById("simpleUrlList");
      while (simpleUrlList.firstChild) {
        simpleUrlList.removeChild(simpleUrlList.firstChild);
      }

      // Clear the tweet embed container
      const tweetEmbedContainer = document.getElementById(
        "tweetEmbedContainer"
      );
      while (tweetEmbedContainer.firstChild) {
        tweetEmbedContainer.removeChild(tweetEmbedContainer.firstChild);
      }


      // Clear the tweet cache and pagination state
      tweetCache = {};
      allUrls = [];
      currentPage = 0;
      hasMorePages = false;
      isLoading = false;

      // Hide loading indicator
      const loadingIndicator = document.getElementById("loadingIndicator");
      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }

      // Update UI elements
      updateUrlList([]);

      // Maintain the current view state
      localStorage.setItem("isEmbeddedViewVisible", isEmbeddedViewVisible);
    });
  }
});

function showError(errorMessage) {
  const errorContainer = document.getElementById("errorContainer");
  errorContainer.textContent = errorMessage;
  errorContainer.style.display = "block";
}

// Replace console.error with a custom function
const originalConsoleError = console.error;
console.error = function (...args) {
  originalConsoleError.apply(console, args);
  showError(args.join(" "));
};
