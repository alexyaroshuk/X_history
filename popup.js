document.addEventListener("DOMContentLoaded", function () {
  const clearButton = document.getElementById("clearButton");
  const urlList = document.getElementById("urlList");
  const emptyList = document.getElementById("emptyList");

  // Function to update the URL list
  function updateUrlList(urls) {
    urlList.innerHTML = ""; // Clear the current list
    if (urls.length === 0) {
      emptyList.style.display = "block"; // Show the empty list message
    } else {
      emptyList.style.display = "none"; // Hide the empty list message
      urls.forEach((url) => {
        const div = document.createElement("div");
        div.textContent = url;
        div.style.cursor = "pointer";
        div.onclick = () => window.open(url, "_blank");
        urlList.appendChild(div);
      });
    }
  }

  // Load and display saved URLs
  chrome.storage.local.get({ urls: [] }, (data) => {
    updateUrlList(data.urls);
  });

  // Listen for messages from the background script to update the URL list
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received:", message);
    if (message.action === "updateUrlList") {
      updateUrlList(message.urls);
    }
  });

  // Clear the list of saved URLs
  clearButton.addEventListener("click", function () {
    chrome.storage.local.set({ urls: [] }, () => {
      updateUrlList([]); // Update the list to show it's empty
    });
  });

  // Check current tab URL on reload
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let currentUrl = tabs[0].url;
    const urlObj = new URL(currentUrl);
    const pathSegments = urlObj.pathname.split("/").filter(Boolean);

    if (
      urlObj.hostname === "twitter.com" &&
      pathSegments.length === 3 &&
      pathSegments[1] === "status"
    ) {
      chrome.storage.local.get({ urls: [] }, (data) => {
        if (!data.urls.includes(currentUrl)) {
          data.urls.push(currentUrl);
          chrome.storage.local.set({ urls: data.urls }, () => {
            updateUrlList(data.urls);
          });
        }
      });
    }
  });
});
