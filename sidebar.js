document.addEventListener("DOMContentLoaded", function () {
  const clearButton = document.getElementById("clearButton");

  const toggleViewButton = document.getElementById("toggleViewButton");
  const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");
  const simpleUrlList = document.getElementById("simpleUrlList");

  const emptyList = document.getElementById("emptyList");
  const loadingIndicator = document.getElementById("loadingIndicator");

  console.log("DOM fully loaded and parsed");

  const closeButton = document.getElementById("closeButton");
  console.log("Close button:", closeButton); // Check if the button is found

  tweetEmbedContainer.style.display = "block"; // Ensure embedded view is visible
  simpleUrlList.style.display = "none"; // Ensure simple view is hidden
  console.log("Embedded view display:", tweetEmbedContainer.style.display);
  console.log("Simple view display:", simpleUrlList.style.display);

  toggleViewButton.textContent = "Show Simple View";
  // Fetch and display URLs in the embedded view
  chrome.storage.local.get({ urls: [] }, function (data) {
    updateUrlList(data.urls); // This should handle displaying the correct view based on URLs
  });

  toggleViewButton.addEventListener("click", function () {
    const skeletonContainer = document.querySelector(".skeleton-container");
    chrome.storage.local.get({ urls: [] }, function (data) {
      let urls = data.urls; // Retrieve URLs when needed
      console.log("Toggling view");
      if (tweetEmbedContainer.style.display === "none") {
        console.log("Showing embedded view");
        tweetEmbedContainer.style.display = "block";
        simpleUrlList.style.display = "none";
        toggleViewButton.textContent = "Show Simple View";
        // Ensure tweets are embedded when switching to embedded view
        urls.forEach((url) => embedTweet(url));
      } else {
        console.log("Showing simple view");
        tweetEmbedContainer.style.display = "none";
        skeletonContainer.style.display = "none";
        simpleUrlList.style.display = "block";
        toggleViewButton.textContent = "Show Embedded View";
      }
    });
  });

  if (closeButton) {
    closeButton.addEventListener("click", function () {
      console.log("clicked close"); // Debug log
      chrome.runtime.sendMessage({ action: "toggleSidebar", visible: false });
    });
  } else {
    console.log("Close button not found");
  }
});

function showLoadingIndicator(show) {
  loadingIndicator.style.display = show ? "block" : "none";
}

function loadTwitterScript(attempts) {
  return new Promise((resolve, reject) => {
    if (attempts <= 0) {
      reject(
        new Error("Failed to load Twitter Widgets JS after several attempts")
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = () => {
      console.log("Twitter Widgets JS loaded successfully.");
      resolve();
    };
    script.onerror = () => {
      console.error("Failed to load Twitter Widgets JS, retrying...");
      loadTwitterScript(attempts - 1)
        .then(resolve)
        .catch(reject);
    };
    document.head.appendChild(script);
  });
}

let twitterWidgetsLoaded = new Promise((resolve, reject) => {
  if (window.twttr && window.twttr.widgets) {
    console.log("Twitter Widgets already available.");
    resolve();
  } else {
    loadTwitterScript(3).then(resolve).catch(reject);
  }
});

loadTwitterScript(3); // Try up to 3 times to load the script

function embedTweet(url) {
  twitterWidgetsLoaded
    .then(() => {
      const tweetEmbedContainer = document.getElementById(
        "tweetEmbedContainer"
      );
      const skeletonContainer = document.querySelector(".skeleton-container");

      // Show the skeleton container at the start of the fetch
      if (skeletonContainer) {
        skeletonContainer.style.display = "flex";
      }

      // Clear existing tweets before embedding new ones
      tweetEmbedContainer.innerHTML = "";

      fetch(
        `https://publish.twitter.com/oembed?url=${encodeURIComponent(
          url
        )}&omit_script=1&hide_thread=true`
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.html) {
            const tweetDiv = document.createElement("div");
            tweetDiv.innerHTML = data.html;
            tweetDiv.style.visibility = "hidden"; // Initially hide the loaded content
            tweetEmbedContainer.prepend(tweetDiv);

            twttr.widgets.load(tweetDiv).then(() => {
              console.log("Tweet embedded and UI loaded for URL:", url);
              tweetDiv.style.visibility = "visible"; // Show the loaded content
              // Hide the skeleton cards once the content is fully loaded
              if (skeletonContainer) {
                skeletonContainer.style.display = "none";
              }
            });
          }
        })
        .catch((error) => {
          console.error("Error embedding tweet:", error);
          // Ensure to hide the skeleton if the fetch fails
          if (skeletonContainer) {
            skeletonContainer.style.display = "none";
          }
        });
    })
    .catch((error) => {
      console.error("Twitter Widgets JS library failed to load:", error);
      // Also hide the skeleton in case of library load failure
      if (skeletonContainer) {
        skeletonContainer.style.display = "none";
      }
    });
}

function updateUrlList(urls) {
  const simpleUrlList = document.getElementById("simpleUrlList");
  const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");
  const toggleViewButton = document.getElementById("toggleViewButton");

  simpleUrlList.innerHTML = ""; // Clear existing content
  tweetEmbedContainer.innerHTML = ""; // Clear embedded tweets

  if (urls.length === 0) {
    emptyList.style.display = "block";
    tweetEmbedContainer.style.display = "none";
    simpleUrlList.style.display = "none";
    toggleViewButton.style.display = "none";
    clearButton.style.display = "none";
    showLoadingIndicator(false);
  } else {
    emptyList.style.display = "none";
    // Do not alter display properties here; maintain current state
    toggleViewButton.style.display = "block";
    clearButton.style.display = "block";
    showLoadingIndicator(true);

    // Populate the simple URL list in reversed order
    urls
      .slice()
      .reverse()
      .forEach((url) => {
        const link = document.createElement("a");
        link.href = url;
        link.textContent = url;
        link.className = "url-link";
        link.target = "_blank";
        simpleUrlList.appendChild(link);
      });
    // Conditionally populate the embedded tweets based on current visibility
    if (tweetEmbedContainer.style.display === "block") {
      Promise.all(urls.map((url) => embedTweet(url))).then(() => {
        showLoadingIndicator(false); // Hide loading indicator after all tweets are processed
      });
    } else {
      showLoadingIndicator(false); // Hide loading indicator immediately if not embedding
    }
  }
}

chrome.storage.local.get({ urls: [] }, (data) => {
  updateUrlList(data.urls);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateUrlList") {
    updateUrlList(message.urls);
  }
});

clearButton.addEventListener("click", function () {
  if (
    confirm(
      "Are you sure you want to clear all URLs? This action cannot be undone."
    )
  ) {
    chrome.storage.local.set({ urls: [] }, () => {
      updateUrlList([]);
    });
  }
});
