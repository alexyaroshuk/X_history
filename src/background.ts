let currentUrl = ""; // Ensure this is initialized before use

chrome.webNavigation.onCompleted.addListener((details) => {
  // Check if currentUrl is defined and not the same as the new URL
  if (typeof currentUrl !== "undefined" && details.url !== currentUrl) {
    console.log("onCompleted URL:", details.url); // Debug log
    saveUrl(details.url);
    currentUrl = details.url;
  }
});

// Browser action now handled by popup - no need for onClicked listener
// The popup will open automatically when the icon is clicked

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  // Check if currentUrl is defined and not the same as the new URL
  if (typeof currentUrl !== "undefined" && details.url !== currentUrl) {
    console.log("onHistoryStateUpdated URL:", details.url); // Debug log
    saveUrl(details.url);
    currentUrl = details.url;
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
      console.log('========================================');
      console.log("[BACKGROUND] Current total URLs in storage:", data.urls.length);
      console.log("[BACKGROUND] First 3 URLs before update:", data.urls.slice(0, 3));

      // Check if URL already exists
      const existingIndex = data.urls.indexOf(baseUrl);
      if (existingIndex !== -1) {
        // URL already exists - don't move it, just log and return
        console.log("[BACKGROUND] URL already exists at position", existingIndex, "- keeping position:", baseUrl);
        console.log('========================================');
        return; // Exit without making any changes
      }

      // Only add new URLs to the beginning
      console.log("[BACKGROUND] New URL being added to top:", baseUrl);
      data.urls.unshift(baseUrl);

      chrome.storage.local.set({ urls: data.urls }, () => {
        console.log("[BACKGROUND] New URL saved at top:", baseUrl);
        console.log("[BACKGROUND] New total URLs:", data.urls.length);
        console.log("[BACKGROUND] First 3 URLs after update:", data.urls.slice(0, 3));
        console.log("[BACKGROUND] Timestamp:", new Date().toISOString());
        console.log('========================================');

        chrome.runtime.sendMessage({
          action: "updateUrlList",
          urls: data.urls,
        });
      });
    });
  } else {
    console.log("URL does not meet saving criteria, not saved:", baseUrl);
  }
}
