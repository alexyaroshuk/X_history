// Initialize or retrieve the view state
let isEmbeddedViewVisible =
  localStorage.getItem("isEmbeddedViewVisible") === "true";

document.addEventListener("DOMContentLoaded", function () {
  const clearButton = document.getElementById("clearButton");

  const toggleViewButton = document.getElementById("toggleViewButton");
  const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");
  const simpleUrlList = document.getElementById("simpleUrlList");

  let singleSkeletonCard = document.getElementById("singleSkeletonCard");

  // Check if the skeleton card exists, if not, create and append it
  if (!singleSkeletonCard) {
    singleSkeletonCard = document.createElement("div");
    singleSkeletonCard.id = "singleSkeletonCard";
    singleSkeletonCard.className = "skeleton-card";
    singleSkeletonCard.style.display = "none"; // Initially hidden
    tweetEmbedContainer.prepend(singleSkeletonCard);
  }

  const emptyList = document.getElementById("emptyList");

  console.log("DOM fully loaded and parsed");

  const closeButton = document.getElementById("closeButton");
  console.log("Close button:", closeButton); // Check if the button is found

  // Set initial display based on the persisted state or default
  tweetEmbedContainer.style.display = isEmbeddedViewVisible ? "block" : "none";
  simpleUrlList.style.display = isEmbeddedViewVisible ? "none" : "block";
  toggleViewButton.textContent = isEmbeddedViewVisible
    ? "Show Simple View"
    : "Show Embedded View";

  toggleViewButton.addEventListener("click", function () {
    // Toggle the state of isEmbeddedViewVisible
    isEmbeddedViewVisible = !isEmbeddedViewVisible;
    localStorage.setItem(
      "isEmbeddedViewVisible",
      isEmbeddedViewVisible.toString()
    );

    console.log("Toggling view");
    if (isEmbeddedViewVisible) {
      console.log("Showing embedded view");
      tweetEmbedContainer.style.display = "block";
      simpleUrlList.style.display = "none";
      toggleViewButton.textContent = "Show Simple View";

      // Get the URLs from the simple URL list
      const simpleUrls = [...simpleUrlList.querySelectorAll("a")].map(
        (link) => link.href
      );

      // Filter out the URLs that are already in the tweet cache
      const newUrls = simpleUrls.filter((url) => !(url in tweetCache));

      // Embed the new tweets
      newUrls.forEach((url) => {
        embedTweet(url);
      });
    } else {
      console.log("Showing simple view");
      tweetEmbedContainer.style.display = "none";
      simpleUrlList.style.display = "block";
      toggleViewButton.textContent = "Show Embedded View";
    }
  });

  if (closeButton) {
    closeButton.addEventListener("click", function () {
      chrome.runtime.sendMessage({ action: "toggleSidebar", visible: false });
    });
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
let tweetCache = {};

function embedTweet(url) {
  const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");
  const singleSkeletonCard = document.getElementById("singleSkeletonCard");

  // Ensure the skeleton card is at the top of the container
  tweetEmbedContainer.prepend(singleSkeletonCard);

  // Show skeleton card
  singleSkeletonCard.style.display = "block";

  // Show skeleton card

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

  // Update visibility based on isEmbeddedViewVisible
  tweetEmbedContainer.style.display = isEmbeddedViewVisible ? "block" : "none";
  simpleUrlList.style.display = isEmbeddedViewVisible ? "none" : "block";
  toggleViewButton.textContent = isEmbeddedViewVisible
    ? "Show Simple View"
    : "Show Embedded View";

  if (urls.length === 0) {
    emptyList.style.display = "block";
    tweetEmbedContainer.style.display = "none";
    simpleUrlList.style.display = "none";
    toggleViewButton.style.display = "none";
    clearButton.style.display = "none";
  } else {
    if (isEmbeddedViewVisible) {
      tweetEmbedContainer.style.display = "block";
    } else {
      simpleUrlList.style.display = "block";
    }
    emptyList.style.display = "none";
    toggleViewButton.style.display = "block";
    clearButton.style.display = "block";

    const existingUrls = new Set(
      [...simpleUrlList.querySelectorAll("a")].map((link) => link.href)
    );

    const newUrls = urls.filter((url) => !existingUrls.has(url));

    // Iterate over the new URLs
    newUrls.forEach((url) => {
      // Create a link for the new URL
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
    });

    // Conditionally populate the embedded tweets based on current visibility
    if (isEmbeddedViewVisible) {
      newUrls.forEach((url) => {
        embedTweet(url);
      });
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
      // Clear the simple URL list
      const simpleUrlList = document.getElementById("simpleUrlList");
      while (simpleUrlList.firstChild) {
        simpleUrlList.removeChild(simpleUrlList.firstChild);
      }

      // Clear the tweet embed container
      const tweetEmbedContainer = document.getElementById(
        "tweetEmbedContainer"
      );
      while (tweetEmbedContainer.firstChild) {
        tweetEmbedContainer.removeChild(tweetEmbedContainer.firstChild);
      }

      // Recreate the skeleton card
      const skeletonCard = document.createElement("div");
      skeletonCard.id = "singleSkeletonCard";
      skeletonCard.style.display = "none"; // Initially hidden
      skeletonCard.className = "skeleton-card"; // Add any necessary classes
      tweetEmbedContainer.appendChild(skeletonCard);

      // Clear the tweet cache
      tweetCache = {};

      // Update UI elements
      updateUrlList([]);

      // Maintain the current view state
      localStorage.setItem("isEmbeddedViewVisible", isEmbeddedViewVisible);
    });
  }
});

function showError(errorMessage) {
  const errorContainer = document.getElementById("errorContainer");
  errorContainer.textContent = errorMessage;
  errorContainer.style.display = "block";
}

// Replace console.error with a custom function
const originalConsoleError = console.error;
console.error = function (...args) {
  originalConsoleError.apply(console, args);
  showError(args.join(" "));
};
