let currentUrl = "";

interface StorageData {
  urls: string[];
}

chrome.webNavigation.onCompleted.addListener((details) => {
  if (typeof currentUrl !== "undefined" && details.url !== currentUrl) {
    console.log("onCompleted URL:", details.url);
    saveUrl(details.url);
    currentUrl = details.url;
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (typeof currentUrl !== "undefined" && details.url !== currentUrl) {
    console.log("onHistoryStateUpdated URL:", details.url);
    saveUrl(details.url);
    currentUrl = details.url;
  }
});

async function saveUrl(url: string): Promise<void> {
  console.log("Attempting to save URL:", url);
  const urlObj = new URL(url);
  const baseUrl = urlObj.origin + urlObj.pathname;

  console.log("Base URL:", baseUrl);
  console.log("Hostname:", urlObj.hostname);
  console.log("Path Segments:", urlObj.pathname.split("/").filter(Boolean));

  if (
    urlObj.hostname === "x.com" &&
    urlObj.pathname.split("/").filter(Boolean).length === 3 &&
    urlObj.pathname.split("/").filter(Boolean)[1] === "status"
  ) {
    try {
      const data = await chrome.storage.local.get({ urls: [] }) as StorageData;
      console.log('========================================');
      console.log("[BACKGROUND] Current total URLs in storage:", data.urls.length);
      console.log("[BACKGROUND] First 3 URLs before update:", data.urls.slice(0, 3));

      const existingIndex = data.urls.indexOf(baseUrl);
      if (existingIndex !== -1) {
        console.log("[BACKGROUND] URL already exists at position", existingIndex, "- keeping position:", baseUrl);
        console.log('========================================');
        return;
      }

      console.log("[BACKGROUND] New URL being added to top:", baseUrl);
      data.urls.unshift(baseUrl);

      await chrome.storage.local.set({ urls: data.urls });

      console.log("[BACKGROUND] New URL saved at top:", baseUrl);
      console.log("[BACKGROUND] New total URLs:", data.urls.length);
      console.log("[BACKGROUND] First 3 URLs after update:", data.urls.slice(0, 3));
      console.log("[BACKGROUND] Timestamp:", new Date().toISOString());
      console.log('========================================');

      chrome.runtime.sendMessage({
        action: "updateUrlList",
        urls: data.urls,
      }).catch(() => {
        // Popup might not be open, that's okay
      });
    } catch (error) {
      console.error("Error saving URL:", error);
    }
  } else {
    console.log("URL does not meet saving criteria, not saved:", baseUrl);
  }
}

// Keep service worker alive
chrome.runtime.onInstalled.addListener(() => {
  console.log("X History extension installed/updated");
});

export {};