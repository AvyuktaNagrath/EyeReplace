document.addEventListener('DOMContentLoaded', () => {
    console.log("Popup script loaded");

    document.getElementById("start").addEventListener("click", () => {
        console.log("Button clicked");

        // Get the current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0].id;

            // Inject the content script into the current tab
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']  // Inject content.js file into the tab
            }, () => {
                // Once content.js is injected, send a message to it
                chrome.tabs.sendMessage(tabId, { action: "startEyeOptimize" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError.message);  // Handle error if content script is not available
                    } else {
                        console.log("Response from content script:", response);
                    }
                });
            });
        });
    });
});
