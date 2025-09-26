let allPosts = [];
let filteredPosts = [];
let selectedPosts = new Set();
let currentPage = 0;
const POSTS_PER_PAGE = 20; // Reduced for better performance with embeds
let currentView = 'grid';
let currentSort = 'newest';
let searchQuery = '';
let tweetCache = {};

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
                    post.text = extractTextFromHTML(tweetData.html);
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
    updateLoadMoreButton();

    if (filteredPosts.length === 0) {
        document.getElementById('emptyMessage').style.display = 'block';
        document.getElementById('postsContainer').style.display = 'none';
    } else {
        document.getElementById('emptyMessage').style.display = 'none';
        document.getElementById('postsContainer').style.display = currentView === 'grid' ? 'grid' : 'flex';
    }

    document.getElementById('loadingMessage').style.display = 'none';
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

    // Add checkbox and loading placeholder
    div.innerHTML = `
        <input type="checkbox" class="post-checkbox" ${selectedPosts.has(post.id) ? 'checked' : ''}>
        <div class="post-content">
            <div class="tweet-embed-placeholder">Loading tweet...</div>
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

// Embed tweet function similar to sidebar.js
async function embedTweetInElement(url, container) {
    const contentDiv = container.querySelector('.post-content');

    // Check if tweet is cached in IndexedDB
    const cachedTweet = await tweetDB.getTweet(url);
    if (cachedTweet && cachedTweet.html) {
        contentDiv.innerHTML = cachedTweet.html;

        // Load Twitter widgets if available
        if (window.twttr && window.twttr.widgets) {
            twttr.widgets.load(contentDiv);
        }
        return;
    }

    // Fetch tweet from oEmbed API
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

                contentDiv.innerHTML = data.html;

                // Load Twitter widgets if available
                if (window.twttr && window.twttr.widgets) {
                    twttr.widgets.load(contentDiv);
                }
            }
        })
        .catch(error => {
            console.error("Error embedding tweet:", error);
            // Fallback to simple link
            const urlParts = url.split('/');
            const username = urlParts[3] || 'Unknown';

            contentDiv.innerHTML = `
                <div class="tweet-fallback">
                    <div class="post-author">@${username}</div>
                    <div class="post-error">Tweet preview unavailable</div>
                    <a href="${url}" target="_blank" class="post-link">View on X →</a>
                </div>
            `;
        });
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

// Update load more button
function updateLoadMoreButton() {
    const hasMore = (currentPage + 1) * POSTS_PER_PAGE < filteredPosts.length;
    document.getElementById('loadMoreContainer').style.display = hasMore ? 'block' : 'none';
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

    document.getElementById('loadMoreBtn').addEventListener('click', () => {
        currentPage++;
        renderPosts();
    });
});