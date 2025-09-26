// Shared post list component for both history page and popup
// This module provides reusable functions for rendering posts using FxEmbed

// Extract post ID from URL
function extractPostId(url) {
    const match = url.match(/status\/(\d+)/);
    return match ? match[1] : null;
}

// Format large numbers (1K, 1M, etc.)
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Format date to readable format
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
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

// Linkify URLs, mentions, and hashtags
function linkifyText(text) {
    return text
        .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank" rel="noopener" class="post-link">$&</a>')
        .replace(/@(\w+)/g, '<a href="https://x.com/$1" target="_blank" rel="noopener" class="post-mention">@$1</a>')
        .replace(/#(\w+)/g, '<a href="https://x.com/hashtag/$1" target="_blank" rel="noopener" class="post-hashtag">#$1</a>');
}

// Render photos
function renderPhotos(photos) {
    if (!photos || photos.length === 0) return '';

    if (photos.length === 1) {
        return `<img class="fx-post-media" src="${photos[0].url}" alt="Post media">`;
    }
    return `
        <div class="fx-post-media-grid">
            ${photos.map(photo => `<img src="${photo.url}" alt="Post media">`).join('')}
        </div>
    `;
}

// Render video
function renderVideo(video) {
    if (!video) return '';
    return `
        <video class="fx-post-media" controls>
            <source src="${video.url}" type="video/mp4">
        </video>
    `;
}

// Create FxEmbed post element
async function createFxPostElement(url, searchQuery = '') {
    const div = document.createElement('div');
    div.className = 'post-item';
    div.dataset.postUrl = url;

    // Add skeleton loader initially
    div.innerHTML = `
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
    `;

    // Fetch post data
    const postId = extractPostId(url);
    if (!postId) {
        renderFallback(div, url);
        return div;
    }

    // Check if post is cached in IndexedDB
    const cachedPost = await postDB.getPost(url);
    if (cachedPost && cachedPost.fxData) {
        renderFxPost(div, cachedPost.fxData, url, searchQuery);
        return div;
    }

    // Fetch from FxEmbed API
    try {
        const response = await fetch(`https://api.fxtwitter.com/status/${postId}`);
        const data = await response.json();

        if (data && data.post) {
            // Save to IndexedDB cache
            await postDB.savePost({
                url: url,
                fxData: data.post,
                text: data.post.text || '',
                authorName: data.post.author?.name,
                authorUrl: `https://x.com/${data.post.author?.screen_name}`
            });

            renderFxPost(div, data.post, url, searchQuery);
        } else {
            throw new Error('Invalid response from FxEmbed');
        }
    } catch (error) {
        console.error("Error fetching from FxEmbed:", error);
        renderFallback(div, url);
    }

    return div;
}

// Render FxEmbed post
function renderFxPost(container, postData, url, searchQuery = '') {
    const isDarkMode = document.body.classList.contains("dark-theme");
    const hasMedia = postData.media?.photos?.length || postData.media?.videos?.length;

    // List view layout
    let postHTML;
    if (hasMedia) {
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
                        <span>🔁 ${formatNumber(postData.reposts || 0)}</span>
                        <span>💬 ${formatNumber(postData.replies || 0)}</span>
                    </div>
                    <div class="fx-post-date">${formatDate(postData.created_at)}</div>
                </div>
            </div>
        `;
    } else {
        // List view without media - using same wrapper structure for consistency
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
                </div>
                <div class="fx-post-footer">
                    <div class="fx-post-stats">
                        <span>❤️ ${formatNumber(postData.likes || 0)}</span>
                        <span>🔁 ${formatNumber(postData.reposts || 0)}</span>
                        <span>💬 ${formatNumber(postData.replies || 0)}</span>
                    </div>
                    <div class="fx-post-date">${formatDate(postData.created_at)}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = postHTML;
    container.classList.add('post-loaded');

    // Make the post clickable
    const postElement = container.querySelector('.fx-post');
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

// Render fallback for failed posts
function renderFallback(container, url) {
    const urlParts = url.split('/');
    const username = urlParts[3] || 'Unknown';

    container.innerHTML = `
        <div class="post-fallback">
            <div class="post-author">@${username}</div>
            <div class="post-error">Post preview unavailable</div>
            <a href="${url}" target="_blank" class="post-link">View on X →</a>
        </div>
    `;
    container.classList.add('post-loaded');
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createFxPostElement,
        extractPostId,
        formatNumber,
        formatDate
    };
}