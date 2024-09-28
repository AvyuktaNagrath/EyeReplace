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

    let currentX = null;
    let currentY = null;
    let currentWord = 'blank';
    let cleanedWord = '';

    document.getElementById('project-dot').addEventListener('click', () => {
        const x = parseInt(document.getElementById('x-coordinate').value);
        const y = parseInt(document.getElementById('y-coordinate').value);

        if (!isNaN(x) && !isNaN(y)) {
            currentX = x;
            currentY = y;

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: projectRedDotAndFindWord,
                    args: [x, y]
                }, (results) => {
                    // Update the detected word in the popup
                    currentWord = results[0].result;
                    cleanedWord = cleanWord(currentWord);
                    document.getElementById('detected-word').innerText = cleanedWord || 'blank';
                });

                // Ensure that when the user scrolls, the dot stays in place
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: monitorScroll,
                    args: []
                });
            });
        } else {
            alert('Please enter valid coordinates.');
        }
    });

    function projectRedDotAndFindWord(x, y) {
        // Remove old red dot if it exists
        const oldDot = document.getElementById('red-dot');
        if (oldDot) {
            oldDot.remove();
        }

        // Create new red dot
        const dot = document.createElement('div');
        dot.id = 'red-dot';
        dot.style.position = 'absolute';
        dot.style.left = `${x + window.scrollX}px`;
        dot.style.top = `${y + window.scrollY}px`;
        dot.style.width = '10px';
        dot.style.height = '10px';
        dot.style.backgroundColor = 'red';
        dot.style.borderRadius = '50%';
        dot.style.zIndex = 9999;
        dot.style.pointerEvents = 'none';
        document.body.appendChild(dot);

        // Detect nearby words within 70-pixel radius
        const range = document.caretRangeFromPoint(x, y);
        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
            // Get the text node and split it into words
            const textNode = range.startContainer;
            const text = textNode.textContent;
            const words = text.split(/\s+/).filter(w => w.length > 0);

            // Get the word closest to the red dot within 70 pixels
            let closestWord = 'blank';
            let closestDistance = 70; // Max distance in pixels

            // Loop over the words to find the closest one within the range
            words.forEach(word => {
                const wordRange = document.createRange();
                const wordIndex = text.indexOf(word);
                wordRange.setStart(textNode, wordIndex);
                wordRange.setEnd(textNode, wordIndex + word.length);
                
                const rects = wordRange.getClientRects();
                for (const rect of rects) {
                    const distance = Math.sqrt(
                        Math.pow(x - (rect.left + rect.width / 2), 2) +
                        Math.pow(y - (rect.top + rect.height / 2), 2)
                    );

                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestWord = word;
                    }
                }
            });

            return closestWord;
        } else {
            return 'blank';
        }
    }

    // Function to clean the detected word
    function cleanWord(word) {
        return word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
    }

    // Function to monitor scrolling and adjust dot position
    function monitorScroll() {
        window.addEventListener('scroll', () => {
            const dot = document.getElementById('red-dot');
            if (dot && currentX !== null && currentY !== null) {
                dot.style.left = `${currentX + window.scrollX}px`;
                dot.style.top = `${currentY + window.scrollY}px`;
            }
        });
    }
});
