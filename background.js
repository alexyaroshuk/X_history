let currentUrl = ""; // Ensure this is initialized before use

chrome.webNavigation.onCompleted.addListener((details) => {
  // Check if currentUrl is defined and not the same as the new URL
  if (typeof currentUrl !== "undefined" && details.url !== currentUrl) {
    console.log("onCompleted URL:", details.url); // Debug log
    saveUrl(details.url);
    currentUrl = details.url;
  }
});

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
  const pathSegments = urlObj.pathname.split("/").filter(Boolean);

  console.log("Hostname:", urlObj.hostname); // Log the hostname
  console.log("Path Segments:", pathSegments); // Log the path segments

  if (
    urlObj.hostname === "twitter.com" &&
    pathSegments.length === 3 &&
    pathSegments[1] === "status"
  ) {
    chrome.storage.local.get({ urls: [] }, (data) => {
      console.log("Current URLs in storage:", data.urls); // Log current URLs
      if (!data.urls.includes(url)) {
        data.urls.push(url);
        chrome.storage.local.set({ urls: data.urls }, () => {
          console.log("URL saved:", url); // Confirm URL saved
          chrome.runtime.sendMessage({
            action: "updateUrlList",
            urls: data.urls,
          });
        });
      } else {
        console.log("URL already in storage, not saved again:", url);
      }
    });
  } else {
    console.log("URL does not meet saving criteria, not saved:", url);
  }
}
