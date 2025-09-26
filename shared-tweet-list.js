// Shared tweet list component for both history page and popup
// This module provides reusable functions for rendering tweets using FxEmbed

// Extract tweet ID from URL
function extractTweetId(url) {
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
        .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank" rel="noopener" class="tweet-link">$&</a>')
        .replace(/@(\w+)/g, '<a href="https://twitter.com/$1" target="_blank" rel="noopener" class="tweet-mention">@$1</a>')
        .replace(/#(\w+)/g, '<a href="https://twitter.com/hashtag/$1" target="_blank" rel="noopener" class="tweet-hashtag">#$1</a>');
}

// Render photos
function renderPhotos(photos) {
    if (!photos || photos.length === 0) return '';

    if (photos.length === 1) {
        return `<img class="fx-tweet-media" src="${photos[0].url}" alt="Tweet media">`;
    }
    return `
        <div class="fx-tweet-media-grid">
            ${photos.map(photo => `<img src="${photo.url}" alt="Tweet media">`).join('')}
        </div>
    `;
}

// Render video
function renderVideo(video) {
    if (!video) return '';
    return `
        <video class="fx-tweet-media" controls>
            <source src="${video.url}" type="video/mp4">
        </video>
    `;
}

// Create FxEmbed tweet element
async function createFxTweetElement(url, searchQuery = '') {
    const div = document.createElement('div');
    div.className = 'tweet-item';
    div.dataset.tweetUrl = url;

    // Add skeleton loader initially
    div.innerHTML = `
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
    `;

    // Fetch tweet data
    const tweetId = extractTweetId(url);
    if (!tweetId) {
        renderFallback(div, url);
        return div;
    }

    // Check if tweet is cached in IndexedDB
    const cachedTweet = await tweetDB.getTweet(url);
    if (cachedTweet && cachedTweet.fxData) {
        renderFxTweet(div, cachedTweet.fxData, url, searchQuery);
        return div;
    }

    // Fetch from FxEmbed API
    try {
        const response = await fetch(`https://api.fxtwitter.com/status/${tweetId}`);
        const data = await response.json();

        if (data && data.tweet) {
            // Save to IndexedDB cache
            await tweetDB.saveTweet({
                url: url,
                fxData: data.tweet,
                text: data.tweet.text || '',
                authorName: data.tweet.author?.name,
                authorUrl: `https://twitter.com/${data.tweet.author?.screen_name}`
            });

            renderFxTweet(div, data.tweet, url, searchQuery);
        } else {
            throw new Error('Invalid response from FxEmbed');
        }
    } catch (error) {
        console.error("Error fetching from FxEmbed:", error);
        renderFallback(div, url);
    }

    return div;
}

// Render FxEmbed tweet
function renderFxTweet(container, tweetData, url, searchQuery = '') {
    const isDarkMode = document.body.classList.contains("dark-theme");
    const hasMedia = tweetData.media?.photos?.length || tweetData.media?.videos?.length;

    // List view layout
    let tweetHTML;
    if (hasMedia) {
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
    } else {
        // List view without media - using same wrapper structure for consistency
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

    container.innerHTML = tweetHTML;
    container.classList.add('tweet-loaded');

    // Make the tweet clickable
    const tweetElement = container.querySelector('.fx-tweet');
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

// Render fallback for failed tweets
function renderFallback(container, url) {
    const urlParts = url.split('/');
    const username = urlParts[3] || 'Unknown';

    container.innerHTML = `
        <div class="tweet-fallback">
            <div class="post-author">@${username}</div>
            <div class="post-error">Tweet preview unavailable</div>
            <a href="${url}" target="_blank" class="post-link">View on X →</a>
        </div>
    `;
    container.classList.add('tweet-loaded');
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createFxTweetElement,
        extractTweetId,
        formatNumber,
        formatDate
    };
}