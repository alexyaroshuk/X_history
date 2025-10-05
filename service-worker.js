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

        chrome.storage.local.get({ urls: [], trackedPosts: [] }, (data) => {
            console.log('Current URLs in storage:', data.urls.length);

            const existingIndex = data.urls.indexOf(baseUrl);
            if (existingIndex !== -1) {
                console.log('URL already exists at position', existingIndex);
                return;
            }

            console.log('New URL being added:', baseUrl);
            data.urls.unshift(baseUrl);

            // Also add to trackedPosts for new React popup
            const newPost = {
                url: baseUrl,
                timestamp: Date.now()
            };
            data.trackedPosts.unshift(newPost);

            chrome.storage.local.set({
                urls: data.urls,
                trackedPosts: data.trackedPosts
            }, () => {
                console.log('New URL saved:', baseUrl);
                chrome.runtime.sendMessage({
                    action: 'updateUrlList',
                    urls: data.urls,
                    trackedPosts: data.trackedPosts
                });
            });
        });
    } else {
        console.log('URL does not meet saving criteria:', baseUrl);
    }
}

console.log('Service worker loaded successfully');