import { postDB } from './db.js';
import { createFxPostElement } from './shared-post-list.js';

const POSTS_PER_PAGE = 10;
let currentPage = 0;
let allUrls: string[] = [];
let isLoading = false;
let hasMorePages = false;
let isSearching = false;
let currentSearchQuery = '';

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
}

function showLoadingIndicator(): void {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) {
    indicator.style.display = 'block';
  }
}

function hideLoadingIndicator(): void {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

function initScrollObserver(): void {
  const sentinel = document.getElementById('scrollSentinel');
  if (!sentinel) return;

  const options: IntersectionObserverInit = {
    root: null,
    rootMargin: '0px 0px 100px 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && hasMorePages && !isLoading) {
        console.log('[InfiniteScroll] Loading next page');
        showLoadingIndicator();
        loadNextPage();
      }
    });
  }, options);

  observer.observe(sentinel);
}

async function loadNextPage(): Promise<void> {
  console.log(`[LoadNextPage] Called - isLoading: ${isLoading}, hasMorePages: ${hasMorePages}, currentPage: ${currentPage}, allUrls: ${allUrls.length}`);

  if (isLoading) {
    console.log('[LoadNextPage] Already loading, returning');
    return;
  }

  if (currentPage * POSTS_PER_PAGE >= allUrls.length) {
    console.log('[LoadNextPage] No more posts to load');
    return;
  }

  isLoading = true;
  const startIndex = currentPage * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const pageUrls = allUrls.slice(startIndex, endIndex);

  console.log(`[LoadNextPage] Loading page ${currentPage + 1}, posts ${startIndex + 1}-${Math.min(endIndex, allUrls.length)} of ${allUrls.length}`);

  const postsContainer = document.getElementById('postsContainer');
  if (!postsContainer) return;

  const newPosts: HTMLElement[] = [];
  for (const url of pageUrls) {
    const postElement = await createFxPostElement(url, currentSearchQuery);
    postsContainer.appendChild(postElement);
    newPosts.push(postElement);
  }

  // Apply masonry layout if in grid view
  const contentArea = document.getElementById('contentArea');
  if (contentArea?.classList.contains('grid-view')) {
    // Wait longer for posts to actually render their content
    setTimeout(() => {
      applyMasonryLayout();
    }, 1000); // Give posts more time to fetch and render
  }

  currentPage++;
  hasMorePages = currentPage * POSTS_PER_PAGE < allUrls.length;
  isLoading = false;
  hideLoadingIndicator();

  updateStats();
}

function applyMasonryLayout(): void {
  const contentArea = document.getElementById('contentArea');
  if (!contentArea?.classList.contains('grid-view')) {
    console.log('[Masonry] Not in grid view, skipping');
    return;
  }

  const postsContainer = document.getElementById('postsContainer') as HTMLElement;
  if (!postsContainer) {
    console.log('[Masonry] No posts container found');
    return;
  }

  const allPosts = postsContainer.querySelectorAll('.post-item') as NodeListOf<HTMLElement>;

  console.log(`[Masonry] Found ${allPosts.length} total posts`);

  if (allPosts.length === 0) {
    return;
  }

  // Get container width and calculate columns
  const containerWidth = postsContainer.offsetWidth;
  console.log(`[Masonry] Container width: ${containerWidth}px`);

  const minColumnWidth = 350;
  const gap = 20;

  // Calculate number of columns (ensure we get proper columns)
  let columns = Math.max(1, Math.floor(containerWidth / (minColumnWidth + gap)));
  console.log(`[Masonry] Calculated columns: ${columns} (width ${containerWidth} / ${minColumnWidth + gap})`);

  // For wider screens, force at least 2-3 columns
  if (containerWidth > 800 && columns < 2) columns = 2;
  if (containerWidth > 1200 && columns < 3) columns = 3;

  const actualColumnWidth = (containerWidth - (gap * (columns - 1))) / columns;

  // Initialize column heights array
  const columnHeights = new Array(columns).fill(0);

  // Position each post
  allPosts.forEach((post) => {
    // Wait for post to be loaded before positioning
    if (!post.classList.contains('post-loaded')) {
      // Set up observer to position when loaded
      const observer = new MutationObserver((_, obs) => {
        if (post.classList.contains('post-loaded')) {
          obs.disconnect();
          applyMasonryLayout(); // Recalculate entire layout
        }
      });
      observer.observe(post, { attributes: true, attributeFilter: ['class'] });
      return;
    }

    // Skip if already positioned
    if (post.classList.contains('masonry-positioned')) {
      // Still count its height for column calculation
      const col = Math.floor(parseFloat(post.style.left || '0') / (actualColumnWidth + gap));
      if (col >= 0 && col < columns) {
        const postHeight = post.offsetHeight;
        columnHeights[col] = Math.max(columnHeights[col], parseFloat(post.style.top || '0') + postHeight + gap);
      }
      return;
    }

    // Find shortest column
    const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));

    // Calculate position
    const x = shortestColumn * (actualColumnWidth + gap);
    const y = columnHeights[shortestColumn];

    // Apply position
    post.style.width = `${actualColumnWidth}px`;
    post.style.left = `${x}px`;
    post.style.top = `${y}px`;
    post.classList.add('masonry-positioned');

    // Update column height
    const postHeight = post.offsetHeight;
    columnHeights[shortestColumn] += postHeight + gap;
  });

  // Set container height to accommodate all posts
  const maxHeight = Math.max(...columnHeights);
  postsContainer.style.height = `${maxHeight}px`;
}

function updateStats(): void {
  const statsElement = document.getElementById('stats');
  const totalPostsElement = document.getElementById('totalPosts');

  if (statsElement) {
    const displayedCount = Math.min(currentPage * POSTS_PER_PAGE, allUrls.length);
    statsElement.textContent = `Showing ${displayedCount} of ${allUrls.length} posts`;
  }

  if (totalPostsElement) {
    totalPostsElement.textContent = `${allUrls.length} posts`;
  }
}

async function performSearch(): Promise<void> {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  if (!searchInput) return;

  const query = searchInput.value.trim();
  if (query === currentSearchQuery) return;

  currentSearchQuery = query;
  isSearching = query.length > 0;

  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchResultsInfo = document.getElementById('searchResultsInfo');

  if (isSearching) {
    if (clearSearchBtn) clearSearchBtn.style.display = 'block';
    console.log('[Search] Searching for:', query);

    const searchResults = await postDB.searchPosts(query);
    const searchUrls = searchResults.map(post => post.url);

    console.log(`[Search] Found ${searchUrls.length} matching posts`);

    if (searchResultsInfo) {
      searchResultsInfo.innerHTML = `Found <strong>${searchUrls.length}</strong> posts matching "<strong>${currentSearchQuery}</strong>"`;
      searchResultsInfo.style.display = 'block';
    }

    displayPosts(searchUrls);
  } else {
    clearSearch();
  }
}

function clearSearch(): void {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchResultsInfo = document.getElementById('searchResultsInfo');

  if (searchInput) searchInput.value = '';
  currentSearchQuery = '';
  isSearching = false;
  if (clearSearchBtn) clearSearchBtn.style.display = 'none';
  if (searchResultsInfo) searchResultsInfo.style.display = 'none';

  chrome.storage.local.get({ urls: [] }, (data) => {
    displayPosts((data as { urls: string[] }).urls);
  });
}

function displayPosts(urls: string[]): void {
  console.log('[displayPosts] Called with', urls.length, 'URLs');
  const postsContainer = document.getElementById('postsContainer');
  const loadingMessage = document.getElementById('loadingMessage');
  const emptyMessage = document.getElementById('emptyMessage');

  if (!postsContainer) {
    console.error('[displayPosts] postsContainer not found!');
    return;
  }

  // Hide loading message
  if (loadingMessage) {
    loadingMessage.style.display = 'none';
  }

  postsContainer.innerHTML = '';
  allUrls = urls;
  currentPage = 0;
  hasMorePages = urls.length > POSTS_PER_PAGE;

  if (urls.length === 0) {
    console.log('[displayPosts] No posts to display');
    if (emptyMessage) {
      emptyMessage.style.display = 'block';
    }
    return;
  }

  // Hide empty message if we have posts
  if (emptyMessage) {
    emptyMessage.style.display = 'none';
  }

  console.log('[displayPosts] About to load first page, hasMorePages:', hasMorePages);

  // Always load the first page of posts
  loadNextPage();

  // Always set up infinite scroll (it will check hasMorePages before loading)
  setTimeout(initScrollObserver, 100);

  updateStats();
}

async function exportData(): Promise<void> {
  const posts = await postDB.getAllPosts();
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    posts: posts
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `x-history-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', async () => {
  await postDB.init();
  initTheme();

  const themeToggle = document.getElementById('themeToggle');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchInput = document.getElementById('searchInput');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile') as HTMLInputElement;
  const clearAllBtn = document.getElementById('clearAllBtn');
  const gridViewBtn = document.getElementById('gridViewBtn');
  const listViewBtn = document.getElementById('listViewBtn');
  const contentArea = document.getElementById('contentArea');

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Grid/List view toggle
  if (gridViewBtn && listViewBtn && contentArea) {
    gridViewBtn.addEventListener('click', () => {
      contentArea.classList.remove('list-view');
      contentArea.classList.add('grid-view');
      gridViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
      // Apply masonry layout when switching to grid
      setTimeout(() => {
        applyMasonryLayout();
      }, 50);
    });

    listViewBtn.addEventListener('click', () => {
      contentArea.classList.remove('grid-view');
      contentArea.classList.add('list-view');
      listViewBtn.classList.add('active');
      gridViewBtn.classList.remove('active');
      // Reset positioning when switching to list
      const posts = document.querySelectorAll('.post-item') as NodeListOf<HTMLElement>;
      posts.forEach(post => {
        post.style.position = '';
        post.style.width = '';
        post.style.left = '';
        post.style.top = '';
        post.style.opacity = '1';
      });
      const postsContainer = document.getElementById('postsContainer') as HTMLElement;
      if (postsContainer) {
        postsContainer.style.height = '';
      }
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', clearSearch);
  }

  if (searchInput) {
    // Live search on input
    searchInput.addEventListener('input', () => {
      const query = (searchInput as HTMLInputElement).value.trim();
      // Show/hide clear button
      if (clearSearchBtn) {
        clearSearchBtn.style.display = query.length > 0 ? 'block' : 'none';
      }
      // Debounced search
      clearTimeout((window as any).searchTimeout);
      (window as any).searchTimeout = setTimeout(() => {
        performSearch();
      }, 300);
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        clearTimeout((window as any).searchTimeout);
        performSearch();
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }

  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => {
      importFile.click();
    });

    importFile.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);

          // Validate the import data structure
          if (data.posts && Array.isArray(data.posts)) {
            // Import posts to IndexedDB
            for (const post of data.posts) {
              if (post.url) {
                await postDB.savePost(post);
              }
            }

            // Extract URLs and update Chrome storage
            const urls = data.posts
              .filter((post: any) => post.url)
              .map((post: any) => post.url);

            // Get existing URLs and merge (avoiding duplicates)
            const existingData = await chrome.storage.local.get({ urls: [] }) as { urls: string[] };
            const mergedUrls = [...new Set([...existingData.urls, ...urls])];

            // Save merged URLs to Chrome storage
            await chrome.storage.local.set({ urls: mergedUrls });

            // Refresh the display
            displayPosts(mergedUrls);

            alert(`Successfully imported ${data.posts.length} posts!`);
          } else {
            alert('Invalid import file format. Expected a JSON file with a "posts" array.');
          }
        } catch (error) {
          console.error('Import error:', error);
          alert('Failed to import file. Please check the file format.');
        }

        // Reset the file input
        (e.target as HTMLInputElement).value = '';
      }
    });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all posts? This cannot be undone.')) {
        await postDB.clearAll();
        chrome.storage.local.set({ urls: [] });
        displayPosts([]);
      }
    });
  }

  // Load initial posts
  chrome.storage.local.get({ urls: [] }, (data) => {
    console.log('[History Page] Storage data received:', data);
    const urls = (data as { urls: string[] }).urls || [];
    console.log('[History Page] URLs to display:', urls.length, 'posts');
    displayPosts(urls);
  });

  // Listen for system theme changes
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

  // Handle window resize for masonry layout
  let resizeTimeout: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      const contentArea = document.getElementById('contentArea');
      if (contentArea?.classList.contains('grid-view')) {
        applyMasonryLayout();
      }
    }, 250);
  });
});

export {};