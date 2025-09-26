(function () {
  var sidebar = document.createElement("div");
  sidebar.id = "mySidebar";
  sidebar.style.position = "fixed";
  sidebar.style.top = "0";
  sidebar.style.right = "-33%"; // Start hidden
  sidebar.style.width = "calc(min(33%, 550px))"; // Minimum 33%, maximum 550px
  sidebar.style.height = "100vh";
  sidebar.style.zIndex = "2147483647";
  sidebar.style.overflowY = "hidden";
  sidebar.style.backgroundColor = "#fff";
  sidebar.style.transition = "right 0.2s"; // Smooth transition for toggling

  sidebar.innerHTML = `<iframe src="${chrome.runtime.getURL(
    "popup.html"
  )}" style="height:100%; width:100%; border:none;"></iframe>`;
  document.body.appendChild(sidebar);

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener(function (
    message,
    sender,
    sendResponse
  ) {
    if (message.action === "toggleSidebar") {
      sidebar.style.right = message.visible ? "0" : "-33%";
    }
  });
})();
