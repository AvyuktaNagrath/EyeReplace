document.addEventListener('DOMContentLoaded', () => {
    console.log("Popup script loaded");

    // Automatically run the function when popup is opened or script is loaded
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Send a message to the content script to detect the word automatically
        chrome.tabs.sendMessage(tabs[0].id, { action: 'detectWord' }, (response) => {
            if (response && response.word) {
                console.log(`Detected word: ${response.word}`);
                
            } else {
                console.error("No word detected.");
                
            }
        });
    });


    // Button to start the eye-optimized view
    document.getElementById("start-optimize").addEventListener("click", () => {
        console.log("Start Eye-Optimized View button clicked");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'startEyeOptimize' }, (response) => {
                if (response && response.status) {
                    console.log(response.status);
                }
            });
        });
    });

    // Button to reset the page to the original view
    document.getElementById("reset-page").addEventListener("click", () => {
        console.log("Reset Page button clicked");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'resetPage' }, (response) => {
                if (response && response.status) {
                    console.log(response.status);
                }
            });
        });
    });
});
