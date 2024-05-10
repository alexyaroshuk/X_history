document.addEventListener("DOMContentLoaded", function () {
  const clearButton = document.getElementById("clearButton");

  const toggleViewButton = document.getElementById("toggleViewButton");
  const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");
  const simpleUrlList = document.getElementById("simpleUrlList");

  const emptyList = document.getElementById("emptyList");

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

        // Clear and repopulate embedded tweets only if it's empty
        if (!tweetEmbedContainer.hasChildNodes()) {
          urls.forEach((url) => {
            if (tweetCache[url]) {
              const tweetDiv = document.createElement("div");
              tweetDiv.innerHTML = tweetCache[url];
              tweetEmbedContainer.appendChild(tweetDiv);
              tweetDiv.style.visibility = "visible";
            } else {
              embedTweet(url);
            }
          });
        }
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

// Cache for storing tweet HTML content
const tweetCache = {};

function embedTweet(url) {
  const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");
  const singleSkeletonCard = document.getElementById("singleSkeletonCard");

  // Move the skeleton card to the top of the container
  tweetEmbedContainer.prepend(singleSkeletonCard);
  // Show skeleton card
  singleSkeletonCard.style.display = "block";

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
        tweetDiv.style.height = "0"; // Initially set height to 0 to prevent layout shift
        tweetDiv.style.overflow = "hidden"; // Prevent content from spilling out
        tweetEmbedContainer.prepend(tweetDiv); // Prepend to add to the beginning

        twttr.widgets.load(tweetDiv).then(() => {
          tweetDiv.style.height = ""; // Restore the height
          tweetDiv.style.overflow = ""; // Restore overflow behavior
          tweetDiv.className = "tweet-embed-new"; // Apply animation class after loading
          tweetCache[url] = tweetDiv.innerHTML; // Cache the fully rendered HTML content
          console.log("Tweet embedded and UI loaded for URL:", url);

          // Remove the animation class after the animation duration
          setTimeout(() => {
            tweetDiv.classList.remove("tweet-embed-new");
          }, 1000);

          // Hide skeleton card
          singleSkeletonCard.style.display = "none";
        });
      }
    })
    .catch((error) => {
      console.error("Error embedding tweet:", error);
      // Hide skeleton card even if there's an error
      singleSkeletonCard.style.display = "none";
    });
}

function updateUrlList(urls) {
  const simpleUrlList = document.getElementById("simpleUrlList");
  const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");
  const toggleViewButton = document.getElementById("toggleViewButton");

  if (urls.length === 0) {
    emptyList.style.display = "block";
    tweetEmbedContainer.style.display = "none";
    simpleUrlList.style.display = "none";
    toggleViewButton.style.display = "none";
    clearButton.style.display = "none";
  } else {
    emptyList.style.display = "none";
    toggleViewButton.style.display = "block";
    clearButton.style.display = "block";

    const existingUrls = new Set(
      [...simpleUrlList.querySelectorAll("a")].map((link) => link.href)
    );

    // Iterate over the provided URLs
    urls.forEach((url) => {
      if (!existingUrls.has(url)) {
        // This URL is new, create a link for it
        const link = document.createElement("a");
        link.href = url;
        link.textContent = url;
        link.className = "url-link";
        link.target = "_blank";

        // Apply the animation class to the new link
        link.classList.add("url-link-new");

        // Prepend the new link to the list to show newest on top
        simpleUrlList.prepend(link);

        // Remove the animation class after the animation duration
        setTimeout(() => {
          link.classList.remove("url-link-new");
        }, 1000);

        // Add the URL to the set of existing URLs
        existingUrls.add(url);
      }
    });

    // Conditionally populate the embedded tweets based on current visibility
    if (tweetEmbedContainer.style.display === "block") {
      urls.forEach((url) => {
        if (!tweetCache[url]) {
          embedTweet(url);
        }
      });
    } else {
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
