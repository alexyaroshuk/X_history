import { postDB, FxPostData } from './db.js';

interface FxTwitterResponse {
  tweet: FxPostData;
}

export function extractPostId(url: string): string | null {
    const match = url.match(/status\/(\d+)/);
    return match ? match[1] : null;
}

export function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const dateOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    const dateString = date.toLocaleDateString('en-US', dateOptions);
    const timeString = date.toLocaleTimeString('en-US', timeOptions);
    return `<span class="fx-post-date-day">${dateString}</span><span class="fx-post-date-time">${timeString}</span>`;
}

export function highlightSearchText(text: string, searchQuery: string): string {
    if (!text) return text;

    if (!searchQuery) {
        return linkifyText(text);
    }

    let result = linkifyText(text);

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const parts = result.split(/(<[^>]*>)/);
    const highlighted = parts.map((part, index) => {
        if (index % 2 === 1) return part;

        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return part.replace(regex, '<mark class="search-highlight">$1</mark>');
    });

    return highlighted.join('');
}

export function highlightTextOnly(text: string, searchQuery: string): string {
    if (!searchQuery || !text) return text;

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

export function linkifyText(text: string): string {
    return text
        .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank" rel="noopener" class="post-link">$&</a>')
        .replace(/@(\w+)/g, '<a href="https://x.com/$1" target="_blank" rel="noopener" class="post-mention">@$1</a>')
        .replace(/#(\w+)/g, '<a href="https://x.com/hashtag/$1" target="_blank" rel="noopener" class="post-hashtag">#$1</a>');
}

function renderPhotos(photos: Array<{ url: string }>): string {
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

function renderVideo(video: { url: string } | undefined): string {
    if (!video) return '';
    return `
        <video class="fx-post-media" controls>
            <source src="${video.url}" type="video/mp4">
        </video>
    `;
}

export async function createFxPostElement(url: string, searchQuery = ''): Promise<HTMLElement> {
    const div = document.createElement('div');
    div.className = 'post-item';
    div.dataset.postUrl = url;

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
        </div>
    `;

    const postId = extractPostId(url);
    if (!postId) {
        renderFallback(div, url);
        return div;
    }

    const cachedPost = await postDB.getPost(url);
    if (cachedPost && cachedPost.fxData) {
        renderFxPost(div, cachedPost.fxData, url, searchQuery);
        return div;
    }

    try {
        const response = await fetch(`https://api.fxtwitter.com/status/${postId}`);

        if (!response.ok) {
            throw new Error(`FxTwitter API returned ${response.status}: ${response.statusText}`);
        }

        const data: FxTwitterResponse = await response.json();

        const postData = data?.tweet;

        if (postData) {
            await postDB.savePost({
                url: url,
                fxData: postData,
                text: postData.text || '',
                authorName: postData.author?.name,
                authorUrl: `https://x.com/${postData.author?.screen_name}`
            });

            renderFxPost(div, postData, url, searchQuery);
        } else {
            console.log('FxTwitter API response structure:', data);
            throw new Error('Invalid response structure from FxTwitter API');
        }
    } catch (error) {
        console.error("Error fetching from FxEmbed:", error);
        renderFallback(div, url);
    }

    return div;
}

export function renderFxPost(container: HTMLElement, postData: FxPostData, url: string, searchQuery = ''): void {
    const isDarkMode = document.body.classList.contains("dark-theme");

    let postHTML = `
        <div class="fx-post ${isDarkMode ? 'dark' : 'light'}" data-post-url="${url}">
            <div class="fx-post-header">
                <img class="fx-post-avatar" src="${postData.author?.avatar_url || ''}" alt="${postData.author?.name}">
                <div class="fx-post-author">
                    <div class="fx-post-name">${searchQuery ? highlightTextOnly(postData.author?.name || 'Unknown', searchQuery) : postData.author?.name || 'Unknown'}</div>
                    <div class="fx-post-handle">${searchQuery ? highlightTextOnly(`@${postData.author?.screen_name || 'unknown'}`, searchQuery) : `@${postData.author?.screen_name || 'unknown'}`}</div>
                </div>
                <div class="fx-post-datetime">${formatDate(postData.created_at)}</div>
            </div>
            <div class="fx-post-content">
                <p>${postData.text ? highlightSearchText(postData.text, searchQuery) : ''}</p>
                ${postData.media?.photos?.length ? renderPhotos(postData.media.photos) : ''}
                ${postData.media?.videos?.length ? renderVideo(postData.media.videos[0]) : ''}
            </div>
        </div>
    `;

    container.innerHTML = postHTML;
    container.classList.add('post-loaded');

    const postElement = container.querySelector('.fx-post');
    if (postElement) {
        postElement.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName === 'A' || (e.target as HTMLElement).closest('a')) {
                return;
            }
            window.open(url, '_blank');
        });
    }
}

function renderFallback(container: HTMLElement, url: string): void {
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


if (typeof window !== 'undefined') {
    (window as any).postDB = postDB;
}