import { postDB } from './db.js';
import { createFxPostElement, renderFxPost } from './shared-post-list.js';

// Initialize theme FIRST before anything else
(function initThemeImmediately() {
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (savedTheme === null && systemPrefersDark)) {
    document.documentElement.classList.add("dark-theme");
    document.body.classList.add("dark-theme");
  } else if (savedTheme === "light") {
    document.documentElement.classList.add("light-theme");
    document.body.classList.add("light-theme");
  }
})();

// Global variables
const POSTS_PER_PAGE = 5;
let currentPage = 0;
let allUrls: string[] = [];
let isLoading = false;
let hasMorePages = false;
let scrollObserver: IntersectionObserver | null = null;
let isSearching = false;
let currentSearchQuery = '';

function initScrollObserver(): void {
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }

  const sentinel = document.getElementById('scrollSentinel');
  if (!sentinel) return;

  const options: IntersectionObserverInit = {
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

function showLoadingIndicator(): void {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) {
    indicator.style.display = 'block';
    setTimeout(() => indicator.classList.add('active'), 10);
  }
}

function hideLoadingIndicator(): void {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) {
    indicator.classList.remove('active');
    setTimeout(() => indicator.style.display = 'none', 300);
  }
}

function initTheme(): void {
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (savedTheme === null && systemPrefersDark)) {
    document.body.classList.add("dark-theme");
    updateThemeIcon(true);
  } else if (savedTheme === "light") {
    document.body.classList.add("light-theme");
    updateThemeIcon(false);
  } else {
    updateThemeIcon(systemPrefersDark);
  }
}

function updateThemeIcon(isDark: boolean): void {
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.textContent = isDark ? "☀️" : "🌙";
  }
}

function toggleTheme(): void {
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

  const postEmbedContainer = document.getElementById("postEmbedContainer");
  if (postEmbedContainer) {
    const posts = postEmbedContainer.querySelectorAll('.post-item');
    posts.forEach(async (post) => {
      const url = (post as HTMLElement).dataset.postUrl;
      if (url) {
        const cachedPost = await postDB.getPost(url);
        if (cachedPost && cachedPost.fxData) {
          renderFxPost(post as HTMLElement, cachedPost.fxData, url, currentSearchQuery);
        }
      }
    });
  }
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  const savedTheme = localStorage.getItem("theme");
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
  await postDB.init();
  initTheme();

  const clearButton = document.getElementById("clearButton") as HTMLButtonElement;
  const themeToggle = document.getElementById("themeToggle") as HTMLButtonElement;
  const historyPageBtn = document.getElementById("historyPageBtn") as HTMLButtonElement;
  const toggleViewButton = document.getElementById("toggleViewButton") as HTMLButtonElement;
  const postEmbedContainer = document.getElementById("postEmbedContainer") as HTMLDivElement;
  const simpleUrlList = document.getElementById("simpleUrlList") as HTMLUListElement;
  const searchInput = document.getElementById("searchInput") as HTMLInputElement;
  const searchButton = document.getElementById("searchButton") as HTMLButtonElement;
  const clearSearchButton = document.getElementById("clearSearchButton") as HTMLButtonElement;

  console.log("DOM fully loaded and parsed");

  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  if (historyPageBtn) {
    historyPageBtn.addEventListener("click", function() {
      chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    });
  }

  postEmbedContainer.style.display = "block";
  simpleUrlList.style.display = "none";
  toggleViewButton.style.display = "none";

  const content = document.querySelector('.content');
  if (content) {
    let scrollTimeout: number;
    content.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
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

  searchButton.addEventListener("click", performSearch);
  clearSearchButton.addEventListener("click", clearSearch);
  searchInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      performSearch();
    }
  });

  async function performSearch(): Promise<void> {
    const query = searchInput.value.trim();
    if (query === currentSearchQuery) return;

    currentSearchQuery = query;
    isSearching = query.length > 0;

    if (isSearching) {
      clearSearchButton.style.display = 'block';
      console.log('[Search] Searching for:', query);

      const searchResults = await postDB.searchPosts(query);
      const searchUrls = searchResults.map(post => post.url);

      console.log(`[Search] Found ${searchUrls.length} matching posts`);

      updateUrlList(searchUrls, true);
    } else {
      clearSearch();
    }
  }

  function clearSearch(): void {
    searchInput.value = '';
    currentSearchQuery = '';
    isSearching = false;
    clearSearchButton.style.display = 'none';

    chrome.storage.local.get({ urls: [] }, (data) => {
      updateUrlList((data as { urls: string[] }).urls, false);
    });
  }

  clearButton.addEventListener("click", async function () {
    if (confirm("Are you sure you want to clear all URLs? This action cannot be undone.")) {
      await postDB.clearAll();

      chrome.storage.local.set({ urls: [] }, () => {
        console.log("[Clear] Clearing all URLs and resetting pagination");

        const postEmbedContainer = document.getElementById("postEmbedContainer");
        if (postEmbedContainer) {
          while (postEmbedContainer.firstChild) {
            postEmbedContainer.removeChild(postEmbedContainer.firstChild);
          }
        }

        allUrls = [];
        currentPage = 0;
        hasMorePages = false;
        isLoading = false;

        hideLoadingIndicator();
        updateUrlList([]);
      });
    }
  });
});

function getPaginatedUrls(urls: string[], page: number): string[] {
  const startIndex = page * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  console.log(`[Pagination] Fetching page ${page + 1}, posts ${startIndex + 1}-${Math.min(endIndex, urls.length)} of ${urls.length}`);
  return urls.slice(startIndex, endIndex);
}

async function embedPostFx(url: string): Promise<void> {
  const postEmbedContainer = document.getElementById("postEmbedContainer");
  if (!postEmbedContainer) return;

  const postElement = await createFxPostElement(url, currentSearchQuery);
  postEmbedContainer.appendChild(postElement);

  postElement.classList.add("post-embed-new");
  setTimeout(() => {
    postElement.classList.remove("post-embed-new");
  }, 1000);
}

function updateUrlList(urls: string[], isFromSearch = false): void {
  const postEmbedContainer = document.getElementById("postEmbedContainer");
  const searchResultsInfo = document.getElementById("searchResultsInfo");

  console.log(`[UpdateUrlList] Called with ${urls.length} URLs${isFromSearch ? ' from search' : ''}`);

  allUrls = urls;
  currentPage = 0;
  hasMorePages = urls.length > 0;

  if (searchResultsInfo) {
    if (isFromSearch && currentSearchQuery) {
      searchResultsInfo.innerHTML = `Found <strong>${urls.length}</strong> posts matching "<strong>${currentSearchQuery}</strong>"`;
      searchResultsInfo.classList.add('active');
    } else {
      searchResultsInfo.classList.remove('active');
    }
  }

  const emptyList = document.getElementById("emptyList");
  const clearButton = document.getElementById("clearButton");

  if (urls.length === 0) {
    if (emptyList) emptyList.style.display = "block";
    if (postEmbedContainer) postEmbedContainer.style.display = "none";
    if (clearButton) clearButton.style.display = "none";
  } else {
    if (postEmbedContainer) {
      postEmbedContainer.style.display = "block";
      postEmbedContainer.innerHTML = '';
    }
    if (emptyList) emptyList.style.display = "none";
    if (clearButton) clearButton.style.display = "block";

    loadNextPage();

    const willHaveMore = urls.length > POSTS_PER_PAGE;
    if (willHaveMore) {
      setTimeout(() => {
        initScrollObserver();
      }, 100);
    }
  }
}

function loadNextPage(): void {
  if (isLoading) {
    console.log(`[LoadNextPage] Skipping - already loading`);
    return;
  }

  if (currentPage * POSTS_PER_PAGE >= allUrls.length) {
    console.log(`[LoadNextPage] No more pages to load`);
    hasMorePages = false;
    return;
  }

  isLoading = true;
  const loadingPageNumber = currentPage + 1;
  console.log(`[LoadNextPage] Loading page ${loadingPageNumber}`);

  const pageUrls = getPaginatedUrls(allUrls, currentPage);

  showLoadingSkeleton();

  let loadedCount = 0;
  pageUrls.forEach((url, index) => {
    setTimeout(async () => {
      await embedPostFx(url);
      loadedCount++;

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

  currentPage++;
  hasMorePages = (currentPage * POSTS_PER_PAGE) < allUrls.length;
}

function showLoadingSkeleton(): void {
  const container = document.getElementById("postEmbedContainer");
  if (!container) return;

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

function hideLoadingSkeleton(): void {
  const skeleton = document.getElementById("paginationLoadingSkeleton");
  if (skeleton) {
    skeleton.remove();
  }
}

// Initial load
chrome.storage.local.get({ urls: [] }, async (data) => {
  const urls = (data as { urls: string[] }).urls;
  console.log(`[POPUP OPENED] Total posts: ${urls.length}`);

  updateUrlList(urls);

  for (const url of urls.slice(0, 10)) {
    const cached = await postDB.getPost(url);
    if (!cached || !cached.fxData) {
      console.log('[Cache] Post will be fetched when displayed:', url);
    }
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "updateUrlList") {
    updateUrlList(message.urls);
  }
});

function showError(errorMessage: string): void {
  const errorContainer = document.getElementById("errorContainer");
  if (errorContainer) {
    errorContainer.textContent = errorMessage;
    errorContainer.style.display = "block";
  }
}

const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  originalConsoleError.apply(console, args);
  showError(args.join(" "));
};

export {};