// content.js

// Listen for a message from the background page
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if( request.message === "clicked_page_action" ) {
            console.log('clicked_page_action');
            // Get the current tweet
            var tweet = document.querySelector('.tweet').innerText;
            // Send a message to the background page to save the tweet
            chrome.runtime.sendMessage({"message": "save_tweet", "tweet": tweet});
        }
    }
);
