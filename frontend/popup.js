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

    // Global variable to store the current mode selected
    let selectedMode = null;
    let selectedLanguage = "Spanish";  // Default language for ESL

    // Helper function to remove active class from all buttons
    function clearActiveButtons() {
        document.getElementById('btn-esl').classList.remove('active');
        document.getElementById('btn-dyslexia').classList.remove('active');
        document.getElementById('btn-simplify').classList.remove('active');
    }

    // Add event listeners for each button
    document.getElementById('btn-esl').addEventListener('click', () => {
        clearActiveButtons();  // Clear active state from all buttons
        document.getElementById('btn-esl').classList.add('active');  // Set this button as active
        selectedMode = 'esl';  // Set global variable
        console.log("ESL mode selected");
        sendSelectedModeToContentScript(selectedMode);  // Send the selected mode to content.js
    });

    document.getElementById('btn-dyslexia').addEventListener('click', () => {
        clearActiveButtons();
        document.getElementById('btn-dyslexia').classList.add('active');
        selectedMode = 'dyslexia';
        console.log("Dyslexia mode selected");
        sendSelectedModeToContentScript(selectedMode);
    });

    document.getElementById('btn-simplify').addEventListener('click', () => {
        clearActiveButtons();
        document.getElementById('btn-simplify').classList.add('active');
        selectedMode = 'simplify';
        console.log("Simplify mode selected");
        sendSelectedModeToContentScript(selectedMode);
    });

    // Capture language change from the dropdown for ESL
    document.getElementById('language-select').addEventListener('change', (event) => {
        selectedLanguage = event.target.value;
        console.log(`Selected ESL language: ${selectedLanguage}`);
        sendSelectedLanguageToContentScript(selectedLanguage);  // Send language to content.js
    });

    // Function to send the selected mode to content.js
    function sendSelectedModeToContentScript(mode) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'setMode', mode: mode }, (response) => {
                console.log(`Mode "${mode}" sent to content script.`);
            });
        });
    }

    // Function to send the selected language to content.js
    function sendSelectedLanguageToContentScript(language) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'setESL', language: language }, (response) => {
                console.log(`Language "${language}" sent to content script.`);
            });
        });
    }
});
