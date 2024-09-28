document.addEventListener('DOMContentLoaded', () => {
    console.log("Popup script loaded");

    document.getElementById("start").addEventListener("click", () => {
        console.log("Start button clicked");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                    console.log("Running eye-optimized view");
                    modifyTextContent(); // Direct function call
                    createNavigationArrows();
                }
            });
        });
    });

    document.getElementById("reset").addEventListener("click", () => {
        console.log("Reset button clicked");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                    console.log("Resetting the page to its original state");
                    restoreOriginalStyles(); // Direct function call
                }
            });
        });
    });
});
