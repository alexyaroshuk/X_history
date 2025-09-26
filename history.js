let allPosts = [];
let filteredPosts = [];
let selectedPosts = new Set();
let currentPage = 0;
const POSTS_PER_PAGE = 20; // Reduced for better performance with embeds
let currentView = 'grid';
let currentSort = 'newest';
let searchQuery = '';
let postCache = {};
// Always use FxEmbed only

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (savedTheme === null && systemPrefersDark)) {
        document.body.classList.add("dark-theme");
        document.getElementById("themeToggle").textContent = "☀️";
    } else if (savedTheme === "light") {
        document.body.classList.add("light-theme");
        document.getElementById("themeToggle").textContent = "🌙";
    }
}

// Toggle theme
function toggleTheme() {
    const isDark = document.body.classList.contains("dark-theme");

    if (isDark) {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        localStorage.setItem("theme", "light");
        document.getElementById("themeToggle").textContent = "🌙";
    } else {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
        localStorage.setItem("theme", "dark");
        document.getElementById("themeToggle").textContent = "☀️";
    }
}

// Load posts from storage
async function loadPosts() {
    return new Promise((resolve) => {
        chrome.storage.local.get({ urls: [] }, async (data) => {
            allPosts = data.urls.map((url, index) => ({
                id: index,
                url: url,
                timestamp: Date.now() - (index * 1000 * 60 * 60), // Simulate timestamps
                selected: false
            }));

            // Try to get additional data from IndexedDB
            await postDB.init();
            for (let post of allPosts) {
                const postData = await postDB.getPost(post.url);
                if (postData) {
                    post.authorName = postData.authorName;
                    // Try to get text from various sources
                    if (postData.text) {
                        post.text = postData.text;
                    } else if (postData.fxData && postData.fxData.text) {
                        post.text = postData.fxData.text;
                    } else if (postData.html) {
                        post.text = extractTextFromHTML(postData.html);
                    }
                }
            }

            filteredPosts = [...allPosts];
            resolve();
        });
    });
}

// Extract text from post HTML
function extractTextFromHTML(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    const blockquote = div.querySelector('blockquote');
    if (blockquote) {
        const paragraphs = blockquote.querySelectorAll('p');
        if (paragraphs.length > 0) {
            return paragraphs[0].textContent;
        }
    }
    return '';
}

// Masonry layout variables
let masonryColumns = 4;
let columnGap = 20;
let itemWidth = 300;

// Calculate masonry layout
function calculateMasonryLayout() {
    const container = document.getElementById('postsContainer');
    const containerWidth = container.offsetWidth;

    // Responsive column breakpoints
    if (containerWidth >= 1600) {
        masonryColumns = 5;
    } else if (containerWidth >= 1200) {
        masonryColumns = 4;
    } else if (containerWidth >= 900) {
        masonryColumns = 3;
    } else if (containerWidth >= 600) {
        masonryColumns = 2;
    } else {
        // Mobile - single column
        masonryColumns = 1;
        itemWidth = containerWidth;
        return { masonryColumns, itemWidth };
    }

    // Calculate item width to fit perfectly with gaps
    const totalGapWidth = (masonryColumns - 1) * columnGap;
    itemWidth = Math.floor((containerWidth - totalGapWidth) / masonryColumns);

    return { masonryColumns, itemWidth };
}

// Apply masonry positioning
function applyMasonryLayout() {
    if (currentView !== 'grid') return;

    const container = document.getElementById('postsContainer');
    const posts = container.querySelectorAll('.post-item');

    if (posts.length === 0) return;

    const { masonryColumns, itemWidth } = calculateMasonryLayout();

    // Track the height of each column
    const columnHeights = new Array(masonryColumns).fill(0);

    posts.forEach((post, index) => {
        // Wait for content to be loaded before positioning
        if (!post.classList.contains('post-loaded')) {
            // Try again after post loads
            const observer = new MutationObserver((mutations, obs) => {
                if (post.classList.contains('post-loaded')) {
                    obs.disconnect();
                    applyMasonryLayout();
                }
            });
            observer.observe(post, { attributes: true, attributeFilter: ['class'] });
            return;
        }

        // Find shortest column
        const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));

        // Calculate position
        const x = shortestColumn * (itemWidth + columnGap);
        const y = columnHeights[shortestColumn];

        // Apply positioning
        post.style.width = `${itemWidth}px`;
        post.style.left = `${x}px`;
        post.style.top = `${y}px`;
        post.classList.add('masonry-positioned');

        // Update column height
        const postHeight = post.offsetHeight;
        columnHeights[shortestColumn] += postHeight + columnGap;
    });

    // Set container height to accommodate all posts
    const maxHeight = Math.max(...columnHeights);
    container.style.height = `${maxHeight}px`;
}

// Render posts
function renderPosts(reset = false) {
    if (reset) {
        currentPage = 0;
        document.getElementById('postsContainer').innerHTML = '';
    }

    // Track render time
    renderStartTime = performance.now();

    const container = document.getElementById('postsContainer');
    const start = currentPage * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const postsToRender = filteredPosts.slice(start, end);

    postsToRender.forEach(post => {
        const postElement = createPostElement(post);
        container.appendChild(postElement);
    });

    // Update UI
    updateStats();
    updateLoadMoreIndicator();

    if (filteredPosts.length === 0) {
        document.getElementById('emptyMessage').style.display = 'block';
        document.getElementById('postsContainer').style.display = 'none';
    } else {
        document.getElementById('emptyMessage').style.display = 'none';
        document.getElementById('postsContainer').style.display = 'block';

        // Apply masonry layout for grid view
        if (currentView === 'grid') {
            setTimeout(() => applyMasonryLayout(), 100);
        }

        // Setup infinite scroll after rendering posts
        setupInfiniteScroll();
    }

    document.getElementById('loadingMessage').style.display = 'none';

    // Check if all posts are loaded after a short delay
    setTimeout(checkAllPostsLoaded, 500);
}

// Check if all visible posts are loaded
let renderStartTime = null;

function checkAllPostsLoaded() {
    const allPosts = document.querySelectorAll('.post-item');
    const loadedPosts = document.querySelectorAll('.post-item.post-loaded');

    if (allPosts.length > 0 && allPosts.length === loadedPosts.length) {
        if (renderStartTime) {
            const renderEndTime = performance.now();
            const renderTime = (renderEndTime - renderStartTime).toFixed(2);
            console.log(`✅ All ${allPosts.length} posts loaded in ${renderTime}ms using FxEmbed`);
            renderStartTime = null;

            // Apply masonry layout after all posts are loaded
            if (currentView === 'grid') {
                applyMasonryLayout();
            }
        }
    } else if (allPosts.length > 0) {
        // Check again
        setTimeout(checkAllPostsLoaded, 100);
    }
}

// Create post element with embedded post
function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post-item';
    div.dataset.postId = post.id;
    div.dataset.postUrl = post.url;

    if (selectedPosts.has(post.id)) {
        div.classList.add('selected');
    }

    // Add checkbox and skeleton loader
    div.innerHTML = `
        <input type="checkbox" class="post-checkbox" ${selectedPosts.has(post.id) ? 'checked' : ''}>
        <div class="post-content">
            <div class="post-embed-placeholder">
                <div class="post-skeleton">
                    <div class="skeleton-header">
                        <div class="skeleton-avatar"></div>
                        <div class="skeleton-author">
                            <div class="skeleton-name"></div>
                            <div class="skeleton-handle"></div>
                        </div>
                    </div>
                    <div class="skeleton-content">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                    </div>
                    <div class="skeleton-actions">
                        <div class="skeleton-action"></div>
                        <div class="skeleton-action"></div>
                        <div class="skeleton-action"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add event listeners
    const checkbox = div.querySelector('.post-checkbox');
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        togglePostSelection(post.id);
    });

    // Embed the post
    embedPostInElement(post.url, div);

    return div;
}

// Embed post using FxEmbed only
async function embedPostInElement(url, container) {
    embedPostFxEmbed(url, container);
}

// Embed post using FxEmbed API
async function embedPostFxEmbed(url, container) {
    const contentDiv = container.querySelector('.post-content');

    // Convert X URL to FxEmbed API URL
    const postId = extractPostId(url);
    if (!postId) {
        showFallback(contentDiv, url, container);
        return;
    }

    // Check if post is cached in IndexedDB
    const cachedPost = await postDB.getPost(url);
    if (cachedPost && cachedPost.fxData) {
        renderFxPost(contentDiv, cachedPost.fxData, container, url);
        return;
    }

    // Fetch from FxEmbed API
    fetch(`https://api.fxtwitter.com/status/${postId}`)
        .then(response => response.json())
        .then(async (data) => {
            if (data && data.tweet) {
                // Save to IndexedDB cache
                await postDB.savePost({
                    url: url,
                    fxData: data.tweet,
                    text: data.tweet.text || '',  // Extract text from FxEmbed data
                    authorName: data.tweet.author?.name,
                    authorUrl: `https://x.com/${data.tweet.author?.screen_name}`
                });

                renderFxPost(contentDiv, data.tweet, container, url);
            } else {
                throw new Error('Invalid response from FxEmbed');
            }
        })
        .catch(error => {
            console.error("Error fetching from FxEmbed:", error);
            showFallback(contentDiv, url, container);
        });
}


// Extract post ID from URL
function extractPostId(url) {
    const match = url.match(/status\/(\d+)/);
    return match ? match[1] : null;
}

// Render FxEmbed post data
function renderFxPost(contentDiv, postData, container, url) {
    const skeleton = contentDiv.querySelector('.post-embed-placeholder');
    if (skeleton) skeleton.remove();

    const isDarkMode = document.body.classList.contains("dark-theme");

    // Build the post HTML - different structure for list view
    const isListView = document.getElementById('contentArea').classList.contains('list-view');
    const hasMedia = postData.media?.photos?.length || postData.media?.videos?.length;

    let postHTML;
    if (isListView && hasMedia) {
        // List view with media - side by side layout
        postHTML = `
            <div class="fx-post ${isDarkMode ? 'dark' : 'light'}" data-post-url="${url}">
                <div class="fx-post-wrapper">
                    <div class="fx-post-main">
                        <div class="fx-post-header">
                            <img class="fx-post-avatar" src="${postData.author?.avatar_url || ''}" alt="${postData.author?.name}">
                            <div class="fx-post-author">
                                <div class="fx-post-name">${searchQuery ? highlightTextOnly(postData.author?.name || 'Unknown', searchQuery) : postData.author?.name || 'Unknown'}</div>
                                <div class="fx-post-handle">${searchQuery ? highlightTextOnly(`@${postData.author?.screen_name || 'unknown'}`, searchQuery) : `@${postData.author?.screen_name || 'unknown'}`}</div>
                            </div>
                        </div>
                        <div class="fx-post-content">
                            ${postData.text ? `<p>${highlightSearchText(postData.text, searchQuery)}</p>` : ''}
                        </div>
                    </div>
                    <div class="fx-post-media-container">
                        ${postData.media?.photos?.length ? renderPhotos(postData.media.photos) : ''}
                        ${postData.media?.videos?.length ? renderVideo(postData.media.videos[0]) : ''}
                    </div>
                </div>
                <div class="fx-post-footer">
                    <div class="fx-post-stats">
                        <span>❤️ ${formatNumber(postData.likes || 0)}</span>
                        <span>🔁 ${formatNumber(postData.retweets || 0)}</span>
                        <span>💬 ${formatNumber(postData.replies || 0)}</span>
                    </div>
                    <div class="fx-post-date">${formatDate(postData.created_at)}</div>
                </div>
            </div>
        `;
    } else if (isListView && !hasMedia) {
        // List view without media
        postHTML = `
            <div class="fx-post ${isDarkMode ? 'dark' : 'light'}" data-post-url="${url}">
                <div class="fx-post-header">
                    <img class="fx-post-avatar" src="${postData.author?.avatar_url || ''}" alt="${postData.author?.name}">
                    <div class="fx-post-author">
                        <div class="fx-post-name">${searchQuery ? highlightTextOnly(postData.author?.name || 'Unknown', searchQuery) : postData.author?.name || 'Unknown'}</div>
                        <div class="fx-post-handle">${searchQuery ? highlightTextOnly(`@${postData.author?.screen_name || 'unknown'}`, searchQuery) : `@${postData.author?.screen_name || 'unknown'}`}</div>
                    </div>
                </div>
                <div class="fx-post-content">
                    ${postData.text ? `<p>${highlightSearchText(postData.text, searchQuery)}</p>` : ''}
                </div>
                <div class="fx-post-footer">
                    <div class="fx-post-stats">
                        <span>❤️ ${formatNumber(postData.likes || 0)}</span>
                        <span>🔁 ${formatNumber(postData.retweets || 0)}</span>
                        <span>💬 ${formatNumber(postData.replies || 0)}</span>
                    </div>
                    <div class="fx-post-date">${formatDate(postData.created_at)}</div>
                </div>
            </div>
        `;
    } else {
        // Grid view - standard layout with media included in content
        postHTML = `
            <div class="fx-post ${isDarkMode ? 'dark' : 'light'}" data-post-url="${url}">
                <div class="fx-post-header">
                    <img class="fx-post-avatar" src="${postData.author?.avatar_url || ''}" alt="${postData.author?.name}">
                    <div class="fx-post-author">
                        <div class="fx-post-name">${searchQuery ? highlightTextOnly(postData.author?.name || 'Unknown', searchQuery) : postData.author?.name || 'Unknown'}</div>
                        <div class="fx-post-handle">${searchQuery ? highlightTextOnly(`@${postData.author?.screen_name || 'unknown'}`, searchQuery) : `@${postData.author?.screen_name || 'unknown'}`}</div>
                    </div>
                </div>
                <div class="fx-post-content">
                    ${postData.text ? `<p>${highlightSearchText(postData.text, searchQuery)}</p>` : ''}
                    ${postData.media?.photos?.length ? renderPhotos(postData.media.photos) : ''}
                    ${postData.media?.videos?.length ? renderVideo(postData.media.videos[0]) : ''}
                </div>
                <div class="fx-post-footer">
                    <div class="fx-post-stats">
                        <span>❤️ ${formatNumber(postData.likes || 0)}</span>
                        <span>🔁 ${formatNumber(postData.retweets || 0)}</span>
                        <span>💬 ${formatNumber(postData.replies || 0)}</span>
                    </div>
                    <div class="fx-post-date">${formatDate(postData.created_at)}</div>
                </div>
            </div>
        `;
    }

    contentDiv.innerHTML = postHTML;
    container.classList.add('post-loaded');

    // Make the post clickable
    const postElement = contentDiv.querySelector('.fx-post');
    if (postElement) {
        postElement.addEventListener('click', (e) => {
            // Don't open link if clicking on an existing link inside the post
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            window.open(url, '_blank');
        });
    }
}

// Helper functions
function linkifyText(text) {
    return text
        .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank" rel="noopener" class="post-link">$&</a>')
        .replace(/@(\w+)/g, '<a href="https://x.com/$1" target="_blank" rel="noopener" class="post-mention">@$1</a>')
        .replace(/#(\w+)/g, '<a href="https://x.com/hashtag/$1" target="_blank" rel="noopener" class="post-hashtag">#$1</a>');
}

// Helper function to highlight search matches
function highlightSearchText(text, searchQuery) {
    if (!text) return text;

    // If no search query, just linkify the text
    if (!searchQuery) {
        return linkifyText(text);
    }

    // First apply linkify
    let result = linkifyText(text);

    // Then apply highlighting (avoiding links)
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Split by HTML tags to avoid highlighting inside them
    const parts = result.split(/(<[^>]*>)/);
    const highlighted = parts.map((part, index) => {
        // Skip HTML tags (odd indices after split)
        if (index % 2 === 1) return part;

        // Highlight text in non-tag parts
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return part.replace(regex, '<mark class="search-highlight">$1</mark>');
    });

    return highlighted.join('');
}

// Simple highlight for plain text (no linkification)
function highlightTextOnly(text, searchQuery) {
    if (!searchQuery || !text) return text;

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function renderPhotos(photos) {
    if (photos.length === 1) {
        return `<img class="fx-post-media" src="${photos[0].url}" alt="Post media">`;
    }
    return `
        <div class="fx-post-media-grid">
            ${photos.map(photo => `<img src="${photo.url}" alt="Post media">`).join('')}
        </div>
    `;
}

function renderVideo(video) {
    return `
        <video class="fx-post-media" controls>
            <source src="${video.url}" type="video/mp4">
        </video>
    `;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}


function showFallback(contentDiv, url, container) {
    const skeleton = contentDiv.querySelector('.post-embed-placeholder');
    if (skeleton) skeleton.remove();

    const urlParts = url.split('/');
    const username = urlParts[3] || 'Unknown';

    contentDiv.innerHTML = `
        <div class="tweet-fallback">
            <div class="post-author">@${username}</div>
            <div class="post-error">Post preview unavailable</div>
            <a href="${url}" target="_blank" class="post-link">View on X →</a>
        </div>
    `;
    container.classList.add('post-loaded');
}


// Toggle post selection
function togglePostSelection(postId) {
    if (selectedPosts.has(postId)) {
        selectedPosts.delete(postId);
        document.querySelector(`[data-post-id="${postId}"]`).classList.remove('selected');
    } else {
        selectedPosts.add(postId);
        document.querySelector(`[data-post-id="${postId}"]`).classList.add('selected');
    }
    updateStats();
    updateActionButtons();
}

// Select all posts
function selectAll() {
    filteredPosts.forEach(post => selectedPosts.add(post.id));
    document.querySelectorAll('.post-item').forEach(item => {
        item.classList.add('selected');
        item.querySelector('.post-checkbox').checked = true;
    });
    updateStats();
    updateActionButtons();
}

// Deselect all posts
function deselectAll() {
    selectedPosts.clear();
    document.querySelectorAll('.post-item').forEach(item => {
        item.classList.remove('selected');
        item.querySelector('.post-checkbox').checked = false;
    });
    updateStats();
    updateActionButtons();
}

// Delete selected posts
async function deleteSelected() {
    if (selectedPosts.size === 0) return;

    if (!confirm(`Delete ${selectedPosts.size} selected post(s)? This cannot be undone.`)) {
        return;
    }

    const remainingPosts = allPosts.filter(post => !selectedPosts.has(post.id));
    const remainingUrls = remainingPosts.map(post => post.url);

    chrome.storage.local.set({ urls: remainingUrls }, async () => {
        // Also delete from IndexedDB
        for (let postId of selectedPosts) {
            const post = allPosts.find(p => p.id === postId);
            if (post) {
                await postDB.deletePost(post.url);
            }
        }

        selectedPosts.clear();
        await loadPosts();
        applyFilters();
        renderPosts(true);
    });
}

// Export posts
function exportPosts() {
    const dataToExport = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        posts: allPosts.map(post => ({
            url: post.url,
            timestamp: post.timestamp,
            authorName: post.authorName,
            text: post.text
        }))
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `x-history-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Import posts
function importPosts(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.posts || !Array.isArray(data.posts)) {
                throw new Error('Invalid file format');
            }

            // Get existing URLs
            chrome.storage.local.get({ urls: [] }, async (existing) => {
                const existingUrls = new Set(existing.urls);
                const newUrls = [];

                // Add imported posts that don't already exist
                for (let post of data.posts) {
                    if (!existingUrls.has(post.url)) {
                        newUrls.push(post.url);

                        // Save to IndexedDB if we have additional data
                        if (post.authorName || post.text) {
                            await postDB.savePost({
                                url: post.url,
                                authorName: post.authorName,
                                text: post.text
                            });
                        }
                    }
                }

                if (newUrls.length > 0) {
                    const allUrls = [...existing.urls, ...newUrls];
                    chrome.storage.local.set({ urls: allUrls }, async () => {
                        await loadPosts();
                        applyFilters();
                        renderPosts(true);
                        alert(`Imported ${newUrls.length} new post(s)`);
                    });
                } else {
                    alert('No new posts to import');
                }
            });
        } catch (error) {
            alert('Error importing file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Clear all posts
async function clearAll() {
    if (!confirm('Clear all posts? This cannot be undone.')) {
        return;
    }

    chrome.storage.local.set({ urls: [] }, async () => {
        await postDB.clearAll();
        allPosts = [];
        filteredPosts = [];
        selectedPosts.clear();
        renderPosts(true);
    });
}

// Apply filters and search
function applyFilters() {
    filteredPosts = [...allPosts];

    // Apply search
    if (searchQuery) {
        filteredPosts = filteredPosts.filter(post => {
            const searchLower = searchQuery.toLowerCase();
            const url = post.url.toLowerCase();
            const text = (post.text || '').toLowerCase();
            const author = (post.authorName || '').toLowerCase();

            return url.includes(searchLower) ||
                   text.includes(searchLower) ||
                   author.includes(searchLower);
        });
    }

    // Apply date filter
    const dateFilter = document.getElementById('dateFilter').value;
    if (dateFilter) {
        const filterDate = new Date(dateFilter);
        filterDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);

        filteredPosts = filteredPosts.filter(post => {
            return post.timestamp >= filterDate.getTime() &&
                   post.timestamp < nextDay.getTime();
        });
    }

    // Apply sort
    if (currentSort === 'oldest') {
        filteredPosts.reverse();
    }
}

// Update stats
function updateStats() {
    document.getElementById('totalPosts').textContent = `${filteredPosts.length} post${filteredPosts.length !== 1 ? 's' : ''}`;

    if (selectedPosts.size > 0) {
        document.getElementById('selectedCount').style.display = 'inline';
        document.getElementById('selectedCount').textContent = `${selectedPosts.size} selected`;
    } else {
        document.getElementById('selectedCount').style.display = 'none';
    }
}

// Update action buttons
function updateActionButtons() {
    const hasSelection = selectedPosts.size > 0;
    document.getElementById('deleteSelectedBtn').disabled = !hasSelection;
    document.getElementById('selectAllBtn').style.display = hasSelection ? 'none' : 'inline-block';
    document.getElementById('deselectAllBtn').style.display = hasSelection ? 'inline-block' : 'none';
}

// Update load more indicator
function updateLoadMoreIndicator() {
    const hasMore = (currentPage + 1) * POSTS_PER_PAGE < filteredPosts.length;
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    loadMoreContainer.style.display = hasMore ? 'block' : 'none';

    if (hasMore) {
        updateSkeletonPosts();
    }
}

// Update skeleton posts based on current view
function updateSkeletonPosts() {
    const skeletonContainer = document.getElementById('loadingSkeleton');
    const isGridView = currentView === 'grid';

    // Calculate number of skeleton items based on columns
    let numSkeletons = 2;
    if (isGridView) {
        const { masonryColumns } = calculateMasonryLayout();
        numSkeletons = masonryColumns;
    }

    let skeletonHTML = '';
    for (let i = 0; i < numSkeletons; i++) {
        skeletonHTML += `
            <div class="skeleton-post" style="${isGridView ? 'position: absolute; width: ' + itemWidth + 'px;' : ''}">
                <div class="skeleton-header">
                    <div class="skeleton-avatar"></div>
                    <div class="skeleton-author">
                        <div class="skeleton-name"></div>
                        <div class="skeleton-handle"></div>
                    </div>
                </div>
                <div class="skeleton-content">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                </div>
                <div class="skeleton-actions">
                    <div class="skeleton-action"></div>
                    <div class="skeleton-action"></div>
                    <div class="skeleton-action"></div>
                </div>
            </div>
        `;
    }

    skeletonContainer.innerHTML = skeletonHTML;

    // Apply masonry layout to skeleton items if in grid view
    if (isGridView) {
        const skeletonPosts = skeletonContainer.querySelectorAll('.skeleton-post');
        skeletonPosts.forEach((post, index) => {
            const x = index * (itemWidth + columnGap);
            post.style.left = `${x}px`;
            post.style.top = '0px';
        });
    }
}

// Variables for infinite scroll
let isLoading = false;
let scrollObserver;

// Setup infinite scroll observer
function setupInfiniteScroll() {
    // Disconnect existing observer if any
    if (scrollObserver) {
        scrollObserver.disconnect();
    }

    const loadMoreContainer = document.getElementById('loadMoreContainer');

    scrollObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading) {
                loadMorePosts();
            }
        });
    }, {
        rootMargin: '100px' // Start loading 100px before reaching the element
    });

    scrollObserver.observe(loadMoreContainer);
}

// Load more posts automatically
async function loadMorePosts() {
    if (isLoading) return;

    const hasMore = (currentPage + 1) * POSTS_PER_PAGE < filteredPosts.length;
    if (!hasMore) return;

    isLoading = true;
    currentPage++;

    // Small delay to show skeleton loader
    await new Promise(resolve => setTimeout(resolve, 300));

    renderPosts();
    isLoading = false;

    // Apply masonry layout for newly loaded posts
    if (currentView === 'grid') {
        setTimeout(() => applyMasonryLayout(), 100);
    }
}

// Switch view
function switchView(view) {
    currentView = view;
    const contentArea = document.getElementById('contentArea');

    if (view === 'grid') {
        contentArea.className = 'content-area grid-view';
        document.getElementById('gridViewBtn').classList.add('active');
        document.getElementById('listViewBtn').classList.remove('active');
    } else {
        contentArea.className = 'content-area list-view';
        document.getElementById('listViewBtn').classList.add('active');
        document.getElementById('gridViewBtn').classList.remove('active');
    }

    renderPosts(true);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await loadPosts();
    renderPosts();

    // Add resize handler for masonry layout
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (currentView === 'grid') {
                applyMasonryLayout();
            }
        }, 250);
    });

    // Event listeners
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('gridViewBtn').addEventListener('click', () => switchView('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => switchView('list'));


    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        document.getElementById('clearSearchBtn').style.display = searchQuery ? 'block' : 'none';
        applyFilters();
        renderPosts(true);
    });

    document.getElementById('clearSearchBtn').addEventListener('click', () => {
        searchQuery = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('clearSearchBtn').style.display = 'none';
        applyFilters();
        renderPosts(true);
    });

    document.getElementById('sortOrder').addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFilters();
        renderPosts(true);
    });

    document.getElementById('dateFilter').addEventListener('change', () => {
        applyFilters();
        renderPosts(true);
    });

    document.getElementById('selectAllBtn').addEventListener('click', selectAll);
    document.getElementById('deselectAllBtn').addEventListener('click', deselectAll);
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelected);
    document.getElementById('exportBtn').addEventListener('click', exportPosts);
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);

    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importPosts(e.target.files[0]);
            e.target.value = ''; // Reset file input
        }
    });

    // Infinite scroll is now handled by IntersectionObserver
});