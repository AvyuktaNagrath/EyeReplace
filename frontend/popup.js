document.addEventListener('DOMContentLoaded', () => {
    console.log("Popup script loaded");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'detectWord' }, (response) => {
            if (response && response.word) {
                console.log(`Detected word: ${response.word}`);
            } else {
                console.error("No word detected.");
            }
        });
    });

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


    let selectedMode = null;
    let selectedLanguage = "Spanish";


    function clearActiveButtons() {
        document.getElementById('btn-esl').classList.remove('active');
        document.getElementById('btn-dyslexia').classList.remove('active');
        document.getElementById('btn-simplify').classList.remove('active');
    }

    document.getElementById('btn-esl').addEventListener('click', () => {
        clearActiveButtons();
        document.getElementById('btn-esl').classList.add('active');
        selectedMode = 'esl';
        console.log("ESL mode selected");
        sendSelectedModeToContentScript(selectedMode);
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

    document.getElementById('language-select').addEventListener('change', (event) => {
        selectedLanguage = event.target.value;
        console.log(`Selected ESL language: ${selectedLanguage}`);
        sendSelectedLanguageToContentScript(selectedLanguage);
    });

    function sendSelectedModeToContentScript(mode) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'setMode', mode: mode }, (response) => {
                console.log(`Mode "${mode}" sent to content script.`);
            });
        });
    }

    function sendSelectedLanguageToContentScript(language) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'setESL', language: language }, (response) => {
                console.log(`Language "${language}" sent to content script.`);
            });
        });
    }
});
