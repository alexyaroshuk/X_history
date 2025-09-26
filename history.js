let allPosts = [];
let filteredPosts = [];
let selectedPosts = new Set();
let currentPage = 0;
const POSTS_PER_PAGE = 20; // Reduced for better performance with embeds
let currentView = 'grid';
let currentSort = 'newest';
let searchQuery = '';
let tweetCache = {};
let useFxEmbed = true; // Toggle between FxEmbed and official Twitter embeds

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
            await tweetDB.init();
            for (let post of allPosts) {
                const tweetData = await tweetDB.getTweet(post.url);
                if (tweetData) {
                    post.authorName = tweetData.authorName;
                    // Try to get text from various sources
                    if (tweetData.text) {
                        post.text = tweetData.text;
                    } else if (tweetData.fxData && tweetData.fxData.text) {
                        post.text = tweetData.fxData.text;
                    } else if (tweetData.html) {
                        post.text = extractTextFromHTML(tweetData.html);
                    }
                }
            }

            filteredPosts = [...allPosts];
            resolve();
        });
    });
}

// Extract text from tweet HTML
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
        document.getElementById('postsContainer').style.display = currentView === 'grid' ? 'grid' : 'flex';

        // Setup infinite scroll after rendering posts
        setupInfiniteScroll();
    }

    document.getElementById('loadingMessage').style.display = 'none';

    // Check if all tweets are loaded after a short delay
    setTimeout(checkAllTweetsLoaded, 500);
}

// Check if all visible tweets are loaded
let renderStartTime = null;

function checkAllTweetsLoaded() {
    const allPosts = document.querySelectorAll('.post-item');
    const loadedPosts = document.querySelectorAll('.post-item.tweet-loaded');

    if (allPosts.length > 0 && allPosts.length === loadedPosts.length) {
        if (renderStartTime) {
            const renderEndTime = performance.now();
            const renderTime = (renderEndTime - renderStartTime).toFixed(2);
            console.log(`✅ All ${allPosts.length} tweets loaded in ${renderTime}ms using ${useFxEmbed ? 'FxEmbed' : 'Twitter official'}`);
            renderStartTime = null;
        }
    } else if (allPosts.length > 0) {
        // Check again
        setTimeout(checkAllTweetsLoaded, 100);
    }
}

// Create post element with embedded tweet
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
            <div class="tweet-embed-placeholder">
                <div class="tweet-skeleton">
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

    // Embed the tweet
    embedTweetInElement(post.url, div);

    return div;
}

// Embed tweet using selected method
async function embedTweetInElement(url, container) {
    if (useFxEmbed) {
        embedTweetFxEmbed(url, container);
    } else {
        embedTweetOfficial(url, container);
    }
}

// Embed tweet using FxEmbed API
async function embedTweetFxEmbed(url, container) {
    const contentDiv = container.querySelector('.post-content');

    // Convert Twitter/X URL to FxEmbed API URL
    const tweetId = extractTweetId(url);
    if (!tweetId) {
        showFallback(contentDiv, url, container);
        return;
    }

    // Check if tweet is cached in IndexedDB
    const cachedTweet = await tweetDB.getTweet(url);
    if (cachedTweet && cachedTweet.fxData) {
        renderFxTweet(contentDiv, cachedTweet.fxData, container, url);
        return;
    }

    // Fetch from FxEmbed API
    fetch(`https://api.fxtwitter.com/status/${tweetId}`)
        .then(response => response.json())
        .then(async (data) => {
            if (data && data.tweet) {
                // Save to IndexedDB cache
                await tweetDB.saveTweet({
                    url: url,
                    fxData: data.tweet,
                    text: data.tweet.text || '',  // Extract text from FxEmbed data
                    authorName: data.tweet.author?.name,
                    authorUrl: `https://twitter.com/${data.tweet.author?.screen_name}`
                });

                renderFxTweet(contentDiv, data.tweet, container, url);
            } else {
                throw new Error('Invalid response from FxEmbed');
            }
        })
        .catch(error => {
            console.error("Error fetching from FxEmbed:", error);
            showFallback(contentDiv, url, container);
        });
}

// Embed tweet using official Twitter oEmbed
async function embedTweetOfficial(url, container) {
    const contentDiv = container.querySelector('.post-content');

    // Check if tweet is cached in IndexedDB
    const cachedTweet = await tweetDB.getTweet(url);
    if (cachedTweet && cachedTweet.html) {
        renderOfficialTweet(contentDiv, cachedTweet.html, container);
        return;
    }

    // Fetch from Twitter oEmbed API
    const isDarkMode = document.body.classList.contains("dark-theme");
    const theme = isDarkMode ? "dark" : "light";

    fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=1&hide_thread=true&theme=${theme}`)
        .then(response => response.json())
        .then(async (data) => {
            if (data.html) {
                // Save to IndexedDB cache
                await tweetDB.saveTweet({
                    url: url,
                    html: data.html,
                    authorName: data.author_name,
                    authorUrl: data.author_url
                });

                renderOfficialTweet(contentDiv, data.html, container);
            }
        })
        .catch(error => {
            console.error("Error fetching from Twitter oEmbed:", error);
            showFallback(contentDiv, url, container);
        });
}

// Extract tweet ID from URL
function extractTweetId(url) {
    const match = url.match(/status\/(\d+)/);
    return match ? match[1] : null;
}

// Render FxEmbed tweet data
function renderFxTweet(contentDiv, tweetData, container, url) {
    const skeleton = contentDiv.querySelector('.tweet-embed-placeholder');
    if (skeleton) skeleton.remove();

    const isDarkMode = document.body.classList.contains("dark-theme");

    // Build the tweet HTML - different structure for list view
    const isListView = document.getElementById('contentArea').classList.contains('list-view');
    const hasMedia = tweetData.media?.photos?.length || tweetData.media?.videos?.length;

    let tweetHTML;
    if (isListView && hasMedia) {
        // List view with media - side by side layout
        tweetHTML = `
            <div class="fx-tweet ${isDarkMode ? 'dark' : 'light'}" data-tweet-url="${url}">
                <div class="fx-tweet-wrapper">
                    <div class="fx-tweet-main">
                        <div class="fx-tweet-header">
                            <img class="fx-tweet-avatar" src="${tweetData.author?.avatar_url || ''}" alt="${tweetData.author?.name}">
                            <div class="fx-tweet-author">
                                <div class="fx-tweet-name">${searchQuery ? highlightTextOnly(tweetData.author?.name || 'Unknown', searchQuery) : tweetData.author?.name || 'Unknown'}</div>
                                <div class="fx-tweet-handle">${searchQuery ? highlightTextOnly(`@${tweetData.author?.screen_name || 'unknown'}`, searchQuery) : `@${tweetData.author?.screen_name || 'unknown'}`}</div>
                            </div>
                        </div>
                        <div class="fx-tweet-content">
                            ${tweetData.text ? `<p>${highlightSearchText(tweetData.text, searchQuery)}</p>` : ''}
                        </div>
                    </div>
                    <div class="fx-tweet-media-container">
                        ${tweetData.media?.photos?.length ? renderPhotos(tweetData.media.photos) : ''}
                        ${tweetData.media?.videos?.length ? renderVideo(tweetData.media.videos[0]) : ''}
                    </div>
                </div>
                <div class="fx-tweet-footer">
                    <div class="fx-tweet-stats">
                        <span>❤️ ${formatNumber(tweetData.likes || 0)}</span>
                        <span>🔁 ${formatNumber(tweetData.retweets || 0)}</span>
                        <span>💬 ${formatNumber(tweetData.replies || 0)}</span>
                    </div>
                    <div class="fx-tweet-date">${formatDate(tweetData.created_at)}</div>
                </div>
            </div>
        `;
    } else if (isListView && !hasMedia) {
        // List view without media
        tweetHTML = `
            <div class="fx-tweet ${isDarkMode ? 'dark' : 'light'}" data-tweet-url="${url}">
                <div class="fx-tweet-header">
                    <img class="fx-tweet-avatar" src="${tweetData.author?.avatar_url || ''}" alt="${tweetData.author?.name}">
                    <div class="fx-tweet-author">
                        <div class="fx-tweet-name">${searchQuery ? highlightTextOnly(tweetData.author?.name || 'Unknown', searchQuery) : tweetData.author?.name || 'Unknown'}</div>
                        <div class="fx-tweet-handle">${searchQuery ? highlightTextOnly(`@${tweetData.author?.screen_name || 'unknown'}`, searchQuery) : `@${tweetData.author?.screen_name || 'unknown'}`}</div>
                    </div>
                </div>
                <div class="fx-tweet-content">
                    ${tweetData.text ? `<p>${highlightSearchText(tweetData.text, searchQuery)}</p>` : ''}
                </div>
                <div class="fx-tweet-footer">
                    <div class="fx-tweet-stats">
                        <span>❤️ ${formatNumber(tweetData.likes || 0)}</span>
                        <span>🔁 ${formatNumber(tweetData.retweets || 0)}</span>
                        <span>💬 ${formatNumber(tweetData.replies || 0)}</span>
                    </div>
                    <div class="fx-tweet-date">${formatDate(tweetData.created_at)}</div>
                </div>
            </div>
        `;
    } else {
        // Grid view - standard layout with media included in content
        tweetHTML = `
            <div class="fx-tweet ${isDarkMode ? 'dark' : 'light'}" data-tweet-url="${url}">
                <div class="fx-tweet-header">
                    <img class="fx-tweet-avatar" src="${tweetData.author?.avatar_url || ''}" alt="${tweetData.author?.name}">
                    <div class="fx-tweet-author">
                        <div class="fx-tweet-name">${searchQuery ? highlightTextOnly(tweetData.author?.name || 'Unknown', searchQuery) : tweetData.author?.name || 'Unknown'}</div>
                        <div class="fx-tweet-handle">${searchQuery ? highlightTextOnly(`@${tweetData.author?.screen_name || 'unknown'}`, searchQuery) : `@${tweetData.author?.screen_name || 'unknown'}`}</div>
                    </div>
                </div>
                <div class="fx-tweet-content">
                    ${tweetData.text ? `<p>${highlightSearchText(tweetData.text, searchQuery)}</p>` : ''}
                    ${tweetData.media?.photos?.length ? renderPhotos(tweetData.media.photos) : ''}
                    ${tweetData.media?.videos?.length ? renderVideo(tweetData.media.videos[0]) : ''}
                </div>
                <div class="fx-tweet-footer">
                    <div class="fx-tweet-stats">
                        <span>❤️ ${formatNumber(tweetData.likes || 0)}</span>
                        <span>🔁 ${formatNumber(tweetData.retweets || 0)}</span>
                        <span>💬 ${formatNumber(tweetData.replies || 0)}</span>
                    </div>
                    <div class="fx-tweet-date">${formatDate(tweetData.created_at)}</div>
                </div>
            </div>
        `;
    }

    contentDiv.innerHTML = tweetHTML;
    container.classList.add('tweet-loaded');

    // Make the tweet clickable
    const tweetElement = contentDiv.querySelector('.fx-tweet');
    if (tweetElement) {
        tweetElement.addEventListener('click', (e) => {
            // Don't open link if clicking on an existing link inside the tweet
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
        .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank" rel="noopener" class="tweet-link">$&</a>')
        .replace(/@(\w+)/g, '<a href="https://twitter.com/$1" target="_blank" rel="noopener" class="tweet-mention">@$1</a>')
        .replace(/#(\w+)/g, '<a href="https://twitter.com/hashtag/$1" target="_blank" rel="noopener" class="tweet-hashtag">#$1</a>');
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
        return `<img class="fx-tweet-media" src="${photos[0].url}" alt="Tweet media">`;
    }
    return `
        <div class="fx-tweet-media-grid">
            ${photos.map(photo => `<img src="${photo.url}" alt="Tweet media">`).join('')}
        </div>
    `;
}

function renderVideo(video) {
    return `
        <video class="fx-tweet-media" controls>
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

// Render official Twitter embed
function renderOfficialTweet(contentDiv, html, container) {
    // Remove skeleton first
    const skeleton = contentDiv.querySelector('.tweet-embed-placeholder');
    if (skeleton) skeleton.remove();

    // Add the tweet HTML
    contentDiv.innerHTML = html;

    // Load Twitter widgets if available
    if (window.twttr && window.twttr.widgets) {
        twttr.widgets.load(contentDiv).then(() => {
            container.classList.add('tweet-loaded');
        }).catch(() => {
            container.classList.add('tweet-loaded');
        });
    } else {
        // Load Twitter widgets script if not available
        if (!document.getElementById('twitter-wjs')) {
            const script = document.createElement('script');
            script.id = 'twitter-wjs';
            script.src = 'https://platform.twitter.com/widgets.js';
            script.async = true;
            script.onload = () => {
                if (window.twttr && window.twttr.widgets) {
                    twttr.widgets.load(contentDiv).then(() => {
                        container.classList.add('tweet-loaded');
                    });
                }
            };
            document.body.appendChild(script);
        }
        container.classList.add('tweet-loaded');
    }
}

function showFallback(contentDiv, url, container) {
    const skeleton = contentDiv.querySelector('.tweet-embed-placeholder');
    if (skeleton) skeleton.remove();

    const urlParts = url.split('/');
    const username = urlParts[3] || 'Unknown';

    contentDiv.innerHTML = `
        <div class="tweet-fallback">
            <div class="post-author">@${username}</div>
            <div class="post-error">Tweet preview unavailable</div>
            <a href="${url}" target="_blank" class="post-link">View on X →</a>
        </div>
    `;
    container.classList.add('tweet-loaded');
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
                await tweetDB.deleteTweet(post.url);
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
                            await tweetDB.saveTweet({
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
        await tweetDB.clearAll();
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
    const numSkeletons = isGridView ? 3 : 2; // Show 3 skeletons for grid, 2 for list

    let skeletonHTML = '';
    for (let i = 0; i < numSkeletons; i++) {
        skeletonHTML += `
            <div class="skeleton-post">
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

    // Event listeners
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('gridViewBtn').addEventListener('click', () => switchView('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => switchView('list'));

    // Embed type toggle
    const embedToggle = document.getElementById('embedToggle');
    const toggleText = document.querySelector('.toggle-text');
    embedToggle.addEventListener('change', (e) => {
        const startTime = performance.now();
        useFxEmbed = e.target.checked;
        toggleText.textContent = useFxEmbed ? 'FxEmbed' : 'Twitter';

        // Clear current posts and re-render with new embed type
        console.log(`Switching to ${useFxEmbed ? 'FxEmbed' : 'Twitter official'} embeds...`);
        document.getElementById('postsContainer').innerHTML = '';
        currentPage = 0;
        renderPosts();

        // Log performance
        setTimeout(() => {
            const endTime = performance.now();
            console.log(`Render time: ${(endTime - startTime).toFixed(2)}ms`);
        }, 3000);
    });

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