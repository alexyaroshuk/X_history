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

// Initialize or retrieve the view state - always use embedded view now
let isEmbeddedViewVisible = true; // Always true now, keeping variable for compatibility

// Pagination variables
const POSTS_PER_PAGE = 5;
let currentPage = 0;
let allUrls = [];
let isLoading = false;
let hasMorePages = false;
let scrollObserver = null;
let isSearching = false;
let currentSearchQuery = '';

// Initialize IntersectionObserver for infinite scroll
function initScrollObserver() {
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }

  const sentinel = document.getElementById('scrollSentinel');
  if (!sentinel) return;

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

  // Refresh posts with new theme
  const postEmbedContainer = document.getElementById("postEmbedContainer");
  if (postEmbedContainer) {
    // Re-render posts with new theme
    const posts = postEmbedContainer.querySelectorAll('.post-item');
    posts.forEach(post => {
      const url = post.dataset.postUrl;
      if (url) {
        // Re-render with cached data
        postDB.getPost(url).then(cachedPost => {
          if (cachedPost && cachedPost.fxData) {
            renderFxPost(post, cachedPost.fxData, url, currentSearchQuery);
          }
        });
      }
    });
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

document.addEventListener("DOMContentLoaded", async function () {
  // Initialize database
  await postDB.init();
  // Initialize theme
  initTheme();

  const clearButton = document.getElementById("clearButton");
  const themeToggle = document.getElementById("themeToggle");
  const historyPageBtn = document.getElementById("historyPageBtn");
  const toggleViewButton = document.getElementById("toggleViewButton");
  const postEmbedContainer = document.getElementById("postEmbedContainer");
  const simpleUrlList = document.getElementById("simpleUrlList");
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const clearSearchButton = document.getElementById("clearSearchButton");
  const emptyList = document.getElementById("emptyList");

  console.log("DOM fully loaded and parsed");

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

  // Hide toggle button and simple list - always use embedded view
  postEmbedContainer.style.display = "block";
  simpleUrlList.style.display = "none";
  toggleViewButton.style.display = "none"; // Hide toggle button

  // Fallback: Traditional scroll event listener
  const content = document.querySelector('.content');
  if (content) {
    let scrollTimeout;
    content.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // Check if we're near the bottom
        const scrollPosition = content.scrollTop + content.clientHeight;
        const scrollHeight = content.scrollHeight;
        const threshold = 150;

        if (scrollPosition >= scrollHeight - threshold && hasMorePages && !isLoading) {
          console.log(`[ScrollFallback] Near bottom, loading next page`);
          showLoadingIndicator();
          loadNextPage();
        }
      }, 100);
    });
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
      const searchResults = await postDB.searchPosts(query);
      const searchUrls = searchResults.map(post => post.url);

      console.log(`[Search] Found ${searchUrls.length} matching posts`);

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

  clearButton.addEventListener("click", async function () {
    if (confirm("Are you sure you want to clear all URLs? This action cannot be undone.")) {
      // Clear IndexedDB
      await postDB.clearAll();

      chrome.storage.local.set({ urls: [] }, () => {
        console.log("[Clear] Clearing all URLs and resetting pagination");

        // Clear the post embed container
        const postEmbedContainer = document.getElementById("postEmbedContainer");
        while (postEmbedContainer.firstChild) {
          postEmbedContainer.removeChild(postEmbedContainer.firstChild);
        }

        // Clear state
        allUrls = [];
        currentPage = 0;
        hasMorePages = false;
        isLoading = false;

        // Hide loading indicator
        hideLoadingIndicator();

        // Update UI elements
        updateUrlList([]);
      });
    }
  });
});

// Get paginated URLs
function getPaginatedUrls(urls, page) {
  const startIndex = page * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  console.log(`[Pagination] Fetching page ${page + 1}, posts ${startIndex + 1}-${Math.min(endIndex, urls.length)} of ${urls.length}`);
  return urls.slice(startIndex, endIndex);
}

// Embed post using FxEmbed
async function embedPostFx(url) {
  const postEmbedContainer = document.getElementById("postEmbedContainer");

  const postElement = await createFxPostElement(url, currentSearchQuery);
  postEmbedContainer.appendChild(postElement);

  // Add fade-in animation
  postElement.classList.add("post-embed-new");
  setTimeout(() => {
    postElement.classList.remove("post-embed-new");
  }, 1000);
}

function updateUrlList(urls, isFromSearch = false) {
  const postEmbedContainer = document.getElementById("postEmbedContainer");
  const searchResultsInfo = document.getElementById("searchResultsInfo");

  console.log(`[UpdateUrlList] Called with ${urls.length} URLs${isFromSearch ? ' from search' : ''}`);

  // Store all URLs for pagination
  allUrls = urls;
  currentPage = 0;
  hasMorePages = urls.length > 0;

  // Update search results info
  if (isFromSearch && currentSearchQuery) {
    searchResultsInfo.innerHTML = `Found <strong>${urls.length}</strong> posts matching "<strong>${currentSearchQuery}</strong>"`;
    searchResultsInfo.classList.add('active');
  } else {
    searchResultsInfo.classList.remove('active');
  }

  // Always show embedded view
  if (urls.length === 0) {
    document.getElementById("emptyList").style.display = "block";
    postEmbedContainer.style.display = "none";
    document.getElementById("clearButton").style.display = "none";
  } else {
    postEmbedContainer.style.display = "block";
    document.getElementById("emptyList").style.display = "none";
    document.getElementById("clearButton").style.display = "block";

    // Clear existing content
    postEmbedContainer.innerHTML = '';

    // Load first page
    loadNextPage();

    // Check if there will be more pages
    const willHaveMore = urls.length > POSTS_PER_PAGE;

    if (willHaveMore) {
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
    console.log(`[LoadNextPage] No more pages to load`);
    hasMorePages = false;
    return;
  }

  isLoading = true;
  const loadingPageNumber = currentPage + 1;
  console.log(`[LoadNextPage] Loading page ${loadingPageNumber}`);

  const postEmbedContainer = document.getElementById("postEmbedContainer");

  // Get URLs for current page
  const pageUrls = getPaginatedUrls(allUrls, currentPage);

  // Show loading skeleton
  showLoadingSkeleton();

  // Process URLs for the current page
  let loadedCount = 0;
  pageUrls.forEach((url, index) => {
    // Add slight delay between embeds to prevent overwhelming the API
    setTimeout(async () => {
      await embedPostFx(url);
      loadedCount++;

      // Hide loading skeleton after last item
      if (loadedCount === pageUrls.length) {
        setTimeout(() => {
          hideLoadingSkeleton();
          hideLoadingIndicator();
          isLoading = false;
          console.log(`[LoadNextPage] Page ${loadingPageNumber} loaded successfully`);
        }, 500);
      }
    }, index * 200);
  });

  // Move to next page
  currentPage++;
  hasMorePages = (currentPage * POSTS_PER_PAGE) < allUrls.length;
}

function showLoadingSkeleton() {
  const container = document.getElementById("postEmbedContainer");
  const loadingDiv = document.createElement("div");
  loadingDiv.id = "paginationLoadingSkeleton";
  loadingDiv.className = "pagination-loading";
  loadingDiv.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;
  container.appendChild(loadingDiv);
}

function hideLoadingSkeleton() {
  const skeleton = document.getElementById("paginationLoadingSkeleton");
  if (skeleton) {
    skeleton.remove();
  }
}

// Initial load
chrome.storage.local.get({ urls: [] }, async (data) => {
  console.log(`[POPUP OPENED] Total posts: ${data.urls.length}`);

  // Update the list
  updateUrlList(data.urls);

  // Pre-fetch posts for caching
  for (const url of data.urls.slice(0, 10)) { // Pre-fetch first 10
    const cached = await postDB.getPost(url);
    if (!cached || !cached.fxData) {
      // Will be fetched when displayed
      console.log('[Cache] Post will be fetched when displayed:', url);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateUrlList") {
    // Simply update the list with the new order
    updateUrlList(message.urls);
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