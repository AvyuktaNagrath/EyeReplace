document.addEventListener('DOMContentLoaded', () => {
    console.log("Popup script loaded");

    // Button to detect words based on the current gaze coordinates
    document.getElementById("detect-word").addEventListener("click", () => {
        console.log("Detect Word button clicked");

        // Request word detection from content.js
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'detectWord' }, (response) => {
                if (response && response.word) {
                    console.log(`Detected word: ${response.word}`);
                    document.getElementById('detected-word').innerText = response.word || 'blank';
                } else {
                    console.error("No word detected.");
                    document.getElementById('detected-word').innerText = 'No word detected';
                }
            });
        });
    });

    // Button to project a red dot based on the current gaze coordinates
    document.getElementById("project-dot").addEventListener("click", () => {
        console.log("Project Red Dot button clicked");

        // Request red dot projection from content.js
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'projectRedDot' }, (response) => {
                console.log(response.status);
            });
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
