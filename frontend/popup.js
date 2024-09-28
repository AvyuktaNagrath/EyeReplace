document.addEventListener('DOMContentLoaded', () => {
    console.log("Popup script loaded");

    document.getElementById("start").addEventListener("click", () => {
        console.log("Start button clicked");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'startEyeOptimize' }, (response) => {
                console.log(response.status);
            });
        });
    });

    document.getElementById("reset").addEventListener("click", () => {
        console.log("Reset button clicked");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'resetPage' }, (response) => {
                console.log(response.status);
            });
        });
    });
});
