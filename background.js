let currentUrl = ""; // Ensure this is initialized before use
let sidebarVisible = {}; // Tracks visibility state per tab

chrome.webNavigation.onCompleted.addListener((details) => {
  // Check if currentUrl is defined and not the same as the new URL
  if (typeof currentUrl !== "undefined" && details.url !== currentUrl) {
    console.log("onCompleted URL:", details.url); // Debug log
    saveUrl(details.url);
    currentUrl = details.url;
  }
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  if (typeof sidebarVisible[activeInfo.tabId] === "undefined") {
    sidebarVisible[activeInfo.tabId] = false; // Initialize as not visible
  }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (typeof sidebarVisible[tabId] === "undefined") {
    sidebarVisible[tabId] = false; // Initialize as not visible
  }
});

chrome.browserAction.onClicked.addListener(function (tab) {
  // Toggle the sidebar visibility state
  sidebarVisible[tab.id] = !sidebarVisible[tab.id];
  chrome.tabs.sendMessage(tab.id, {
    action: "toggleSidebar",
    visible: sidebarVisible[tab.id],
  });
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  // Check if currentUrl is defined and not the same as the new URL
  if (typeof currentUrl !== "undefined" && details.url !== currentUrl) {
    console.log("onHistoryStateUpdated URL:", details.url); // Debug log
    saveUrl(details.url);
    currentUrl = details.url;
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "toggleSidebar") {
    let tabId = sender.tab.id;
    sidebarVisible[tabId] = request.visible;
    chrome.tabs.sendMessage(tabId, {
      action: "toggleSidebar",
      visible: sidebarVisible[tabId],
    });
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "fetchTweet") {
    // Try multiple Twitter oEmbed endpoints
    const tryOEmbedEndpoint = (endpoint) => {
      const oEmbedUrl = `${endpoint}?url=${encodeURIComponent(request.url)}&omit_script=1`;
      return fetch(oEmbedUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            return response.text().then(text => {
              console.error('Response is not JSON:', text.substring(0, 200));
              throw new Error('Response is not JSON');
            });
          }
          return response.json();
        });
    };

    // Try different endpoints in order
    const endpoints = [
      'https://publish.twitter.com/oembed',
      'https://api.twitter.com/1.1/statuses/oembed.json',
      'https://cdn.syndication.twimg.com/widgets/tweet'
    ];

    let currentEndpointIndex = 0;

    const tryNextEndpoint = () => {
      if (currentEndpointIndex >= endpoints.length) {
        throw new Error('All Twitter oEmbed endpoints failed');
      }

      const endpoint = endpoints[currentEndpointIndex];
      console.log(`Trying Twitter oEmbed endpoint: ${endpoint}`);

      return tryOEmbedEndpoint(endpoint)
        .catch((error) => {
          console.error(`Failed with endpoint ${endpoint}:`, error);
          currentEndpointIndex++;
          if (currentEndpointIndex < endpoints.length) {
            return tryNextEndpoint();
          }
          throw error;
        });
    };

    tryNextEndpoint()
      .then((data) => {
        console.log('Twitter oEmbed response:', data);
        sendResponse({ success: true, data: data });
      })
      .catch((error) => {
        console.error("Error fetching tweet:", error);
        sendResponse({ success: false, error: error.toString() });
      });
    return true; // Will respond asynchronously.
  }
});

function saveUrl(url) {
  console.log("Attempting to save URL:", url); // Log when attempting to save
  const urlObj = new URL(url);
  const baseUrl = urlObj.origin + urlObj.pathname; // Ignore query parameters

  console.log("Base URL:", baseUrl); // Log the base URL without query parameters
  console.log("Hostname:", urlObj.hostname); // Log the hostname
  console.log("Path Segments:", urlObj.pathname.split("/").filter(Boolean)); // Log the path segments

  if (
    urlObj.hostname === "x.com" &&
    urlObj.pathname.split("/").filter(Boolean).length === 3 &&
    urlObj.pathname.split("/").filter(Boolean)[1] === "status"
  ) {
    chrome.storage.local.get({ urls: [] }, (data) => {
      console.log("Current URLs in storage:", data.urls); // Log current URLs
      if (!data.urls.includes(baseUrl)) {
        data.urls.push(baseUrl);
        chrome.storage.local.set({ urls: data.urls }, () => {
          console.log("URL saved:", baseUrl); // Confirm URL saved
          chrome.runtime.sendMessage({
            action: "updateUrlList",
            urls: data.urls,
          });
        });
      } else {
        console.log("URL already in storage, not saved again:", baseUrl);
      }
    });
  } else {
    console.log("URL does not meet saving criteria, not saved:", baseUrl);
  }
}
