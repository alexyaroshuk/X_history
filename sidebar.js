// Initialize theme FIRST before anything else
(function initThemeImmediately() {
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Apply theme to both html and body
  if (savedTheme === "dark" || (savedTheme === null && systemPrefersDark)) {
    document.documentElement.classList.add("dark-theme");
    document.body.classList.add("dark-theme");
  } else if (savedTheme === "light") {
    document.documentElement.classList.add("light-theme");
    document.body.classList.add("light-theme");
  }
})();

// Initialize or retrieve the view state
let isEmbeddedViewVisible =
  localStorage.getItem("isEmbeddedViewVisible") === "true";

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (savedTheme === null && systemPrefersDark)) {
    document.body.classList.add("dark-theme");
    updateThemeIcon(true);
  } else if (savedTheme === "light") {
    document.body.classList.add("light-theme");
    updateThemeIcon(false);
  } else {
    // Use system preference
    updateThemeIcon(systemPrefersDark);
  }
}

function updateThemeIcon(isDark) {
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.textContent = isDark ? "Light" : "Dark";
  }
}

function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.contains("dark-theme");

  if (isDark) {
    body.classList.remove("dark-theme");
    body.classList.add("light-theme");
    localStorage.setItem("theme", "light");
    updateThemeIcon(false);
  } else {
    body.classList.remove("light-theme");
    body.classList.add("dark-theme");
    localStorage.setItem("theme", "dark");
    updateThemeIcon(true);
  }

  // Refresh tweet embeds if in embedded view
  if (isEmbeddedViewVisible) {
    const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");
    if (tweetEmbedContainer) {
      // Clear tweet cache to force reload with new theme
      tweetCache = {};

      // Get all tweet URLs from the simple list
      const simpleUrlList = document.getElementById("simpleUrlList");
      if (simpleUrlList) {
        const urls = [...simpleUrlList.querySelectorAll("a")].map(link => link.href);

        // Clear and re-embed tweets with new theme
        tweetEmbedContainer.innerHTML = '<div id="singleSkeletonCard" class="skeleton-card" style="display: none;"></div>';
        urls.forEach(url => embedTweet(url));
      }
    }
  }
}

// Listen for system theme changes
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  const savedTheme = localStorage.getItem("theme");
  // Only auto-switch if user hasn't manually set a preference
  if (!savedTheme) {
    if (e.matches) {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
    } else {
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
    }
    updateThemeIcon(e.matches);
  }
});

// Debug function to test Twitter oEmbed endpoints
function debugTwitterEndpoints() {
  const testUrl = "https://x.com/elonmusk/status/123456789";
  const endpoints = [
    'https://publish.twitter.com/oembed',
    'https://api.twitter.com/1.1/statuses/oembed.json',
    'https://cdn.syndication.twimg.com/widgets/tweet'
  ];

  console.log('Testing Twitter oEmbed endpoints...');

  endpoints.forEach((endpoint, index) => {
    const url = `${endpoint}?url=${encodeURIComponent(testUrl)}&omit_script=1`;
    console.log(`Testing endpoint ${index + 1}: ${endpoint}`);

    fetch(url)
      .then(response => {
        console.log(`Endpoint ${index + 1} response:`, {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          ok: response.ok
        });

        if (response.ok) {
          return response.text().then(text => {
            console.log(`Endpoint ${index + 1} content preview:`, text.substring(0, 200));
          });
        }
      })
      .catch(error => {
        console.error(`Endpoint ${index + 1} error:`, error);
      });
  });
}

// Run debug test when sidebar loads (for development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  setTimeout(debugTwitterEndpoints, 2000);
}

document.addEventListener("DOMContentLoaded", function () {
  // Initialize theme
  initTheme();

  const clearButton = document.getElementById("clearButton");
  const themeToggle = document.getElementById("themeToggle");
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

  // Close button removed - no longer needed in popup mode

  // Theme toggle button event listener
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

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

  // Close button handler removed - popup closes automatically
});

function loadTwitterScript(attempts = 3) {
  return new Promise((resolve, reject) => {
    if (attempts <= 0) {
      reject(
        new Error("Failed to load Twitter Widgets JS after several attempts")
      );
      return;
    }

    // Check if already loaded
    if (window.twttr && window.twttr.widgets) {
      console.log("Twitter Widgets already available.");
      resolve();
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="widgets.js"]')) {
      console.log("Twitter Widgets script already loading, waiting...");
      // Wait for the existing script to load
      const checkInterval = setInterval(() => {
        if (window.twttr && window.twttr.widgets) {
          clearInterval(checkInterval);
          console.log("Twitter Widgets loaded from existing script.");
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("Timeout waiting for existing script to load"));
      }, 10000);
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
      // Remove the failed script
      script.remove();
      // Retry with exponential backoff
      setTimeout(() => {
        loadTwitterScript(attempts - 1)
          .then(resolve)
          .catch(reject);
      }, Math.pow(2, 3 - attempts) * 1000); // Exponential backoff: 1s, 2s, 4s
    };
    document.head.appendChild(script);
  });
}

// Initialize Twitter widgets loading promise
let twitterWidgetsLoaded = new Promise((resolve, reject) => {
  if (window.twttr && window.twttr.widgets) {
    console.log("Twitter Widgets already available.");
    resolve();
  } else {
    loadTwitterScript(3).then(resolve).catch(reject);
  }
});

// Cache for storing tweet HTML content
let tweetCache = {};

function embedTweet(url) {
  const tweetEmbedContainer = document.getElementById("tweetEmbedContainer");
  const singleSkeletonCard = document.getElementById("singleSkeletonCard");

  // Ensure the skeleton card is at the top of the container
  tweetEmbedContainer.prepend(singleSkeletonCard);

  // Show skeleton card
  singleSkeletonCard.style.display = "block";

  // Try multiple Twitter oEmbed endpoints
  const tryOEmbedEndpoint = (endpoint) => {
    const isDarkMode = document.body.classList.contains("dark-theme");
    const theme = isDarkMode ? "dark" : "light";
    return fetch(
      `${endpoint}?url=${encodeURIComponent(url)}&omit_script=1&hide_thread=true&theme=${theme}`
    )
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

      if (data.html) {
        const tweetDiv = document.createElement("div");
        tweetDiv.innerHTML = data.html;
        tweetDiv.style.height = "0"; // Initially set height to 0 to prevent layout shift
        tweetDiv.style.overflow = "hidden"; // Prevent content from spilling out
        tweetEmbedContainer.prepend(tweetDiv); // Prepend to add to the beginning

        // Ensure Twitter widgets are loaded before trying to use them
        twitterWidgetsLoaded.then(() => {
          if (window.twttr && window.twttr.widgets) {
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
            }).catch((error) => {
              console.error("Error loading tweet widget:", error);
              singleSkeletonCard.style.display = "none";
            });
          } else {
            console.error("Twitter widgets not available");
            singleSkeletonCard.style.display = "none";
          }
        }).catch((error) => {
          console.error("Error loading Twitter widgets:", error);
          singleSkeletonCard.style.display = "none";
        });
      } else {
        console.error("No HTML content in oEmbed response:", data);
        singleSkeletonCard.style.display = "none";
      }
    })
    .catch((error) => {
      console.error("Error embedding tweet:", error);

      // Fallback: create a simple link instead of embedded tweet
      const fallbackDiv = document.createElement("div");
      fallbackDiv.className = "tweet-fallback";
      fallbackDiv.innerHTML = `
        <div style="padding: 15px; border: 1px solid #ccc; border-radius: 8px; margin: 10px 0;">
          <p style="margin: 0 0 10px 0; color: #666;">Tweet preview unavailable</p>
          <a href="${url}" target="_blank" style="color: #1da1f2; text-decoration: none; word-break: break-all;">
            ${url}
          </a>
        </div>
      `;
      tweetEmbedContainer.prepend(fallbackDiv);

      // Hide skeleton card
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
