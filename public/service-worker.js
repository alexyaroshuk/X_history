// Static service worker file for Chrome extension
console.log('Service worker loading...');

let currentUrl = '';

chrome.webNavigation.onCompleted.addListener((details) => {
    if (typeof currentUrl !== 'undefined' && details.url !== currentUrl) {
        console.log('onCompleted URL:', details.url);
        attemptToSaveUrl(details.url);
        currentUrl = details.url;
    }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (typeof currentUrl !== 'undefined' && details.url !== currentUrl) {
        console.log('onHistoryStateUpdated URL:', details.url);
        attemptToSaveUrl(details.url);
        currentUrl = details.url;
    }
});

function attemptToSaveUrl(url) {
    console.log('Attempting to save URL:', url);
    const urlObject = new URL(url);
    const baseUrl = urlObject.origin + urlObject.pathname;

    console.log('Base URL:', baseUrl);
    console.log('Hostname:', urlObject.hostname);
    console.log('Path Segments:', urlObject.pathname.split('/').filter(Boolean));

    if (urlObject.hostname === 'x.com' &&
        urlObject.pathname.split('/').filter(Boolean).length === 3 &&
        urlObject.pathname.split('/').filter(Boolean)[1] === 'status') {

        chrome.storage.local.get({ urls: [], trackedPosts: [] }, async (data) => {
            console.log('Current URLs in storage:', data.urls.length);

            // Check in both urls and trackedPosts
            const existingUrlIndex = data.urls.indexOf(baseUrl);
            const existingPostIndex = data.trackedPosts.findIndex(p => p.url === baseUrl);

            if (existingUrlIndex !== -1 || existingPostIndex !== -1) {
                console.log('URL already exists');
                return;
            }

            console.log('New URL being added:', baseUrl);
            data.urls.unshift(baseUrl);

            // Extract tweet ID for fetching full data
            const pathParts = urlObject.pathname.split('/').filter(Boolean);
            const username = pathParts[0] || 'Unknown';
            const tweetId = pathParts[2] || '';

            // Fetch full tweet data from FxTwitter API for better search
            if (tweetId) {
                fetch(`https://api.fxtwitter.com/status/${tweetId}`)
                    .then(response => response.json())
                    .then(fxData => {
                        const tweetData = fxData?.tweet;

                        const newPost = {
                            url: baseUrl,
                            author: tweetData?.author?.screen_name ? '@' + tweetData.author.screen_name : '@' + username,
                            content: tweetData?.text || '',
                            timestamp: Date.now(),
                            // Store additional data for rich display
                            authorName: tweetData?.author?.name,
                            hasMedia: !!(tweetData?.media?.photos?.length || tweetData?.media?.videos?.length)
                        };

                        data.trackedPosts.unshift(newPost);

                        chrome.storage.local.set({
                            urls: data.urls,
                            trackedPosts: data.trackedPosts
                        }, () => {
                            console.log('New URL saved with full tweet data:', baseUrl);
                            console.log('Tweet text:', newPost.content.substring(0, 50) + '...');
                        });
                    })
                    .catch(error => {
                        console.error('Failed to fetch tweet data:', error);
                        // Fallback: save basic info
                        const newPost = {
                            url: baseUrl,
                            author: '@' + username,
                            content: '',
                            timestamp: Date.now()
                        };

                        data.trackedPosts.unshift(newPost);

                        chrome.storage.local.set({
                            urls: data.urls,
                            trackedPosts: data.trackedPosts
                        });
                    });
            } else {
                // No tweet ID, save basic info
                const newPost = {
                    url: baseUrl,
                    author: '@' + username,
                    content: '',
                    timestamp: Date.now()
                };

                data.trackedPosts.unshift(newPost);

                chrome.storage.local.set({
                    urls: data.urls,
                    trackedPosts: data.trackedPosts
                });
            }
        });
    } else {
        console.log('URL does not meet saving criteria:', baseUrl);
    }
}

console.log('Service worker loaded successfully');