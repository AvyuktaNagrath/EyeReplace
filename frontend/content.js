// Debugging: Log that the content script has loaded
console.log("Content script loaded and ready to receive messages.");

let latestX = null;  // Store the latest X coordinate
let latestY = null;  // Store the latest Y coordinate

// WebSocket connection to receive gaze data from Flask backend
const socket = io('http://143.215.63.97:5000'); // Connect to the WebSocket

// Event listener for WebSocket connection
socket.on('connect', function () {
    console.log("Socket.IO connection established with Flask backend.");
});

// Event listener for receiving gaze data from the Flask backend
socket.on('screen_gaze_data', function (data) {
    if (data.x !== undefined && data.y !== undefined) {
        latestX = data.x;  // Update the latest gaze coordinates
        latestY = data.y;
        //console.log(`Received Screen Gaze Coordinates: (${latestX}, ${latestY})`);
        
        
        // Continuously project red dot at the latest gaze coordinates
        projectRedDot(latestX, latestY);
    }
});

// Listen for synonym responses from the backend via WebSocket
socket.on('synonym_response', function (data) {
    const { originalWord, simpler_word } = data;
    console.log(`Received synonym for '${originalWord}': '${simpler_word}'`);
    replaceWordInDOM(originalWord, simpler_word);
});

// Function to send detected word to backend via WebSocket
function sendWordToBackendViaSocket(word, context) {
    socket.emit('word_detection', { word, context });
}

function projectRedDot(x, y) {
    // Get the device pixel ratio to adjust for CSS scaling
    const pixelRatio = window.devicePixelRatio;

    // Adjust Beam SDK coordinates for device pixel ratio
    const adjustedX = x / pixelRatio;  // Scale down the x-coordinate
    const adjustedY = y / pixelRatio;  // Scale down the y-coordinate

    // Get the content area offset relative to the viewport
    const contentRect = document.documentElement.getBoundingClientRect();
    const offsetX = contentRect.left;  // Horizontal offset due to browser chrome
    const offsetY = contentRect.top;   // Vertical offset due to browser chrome

    // Apply constant offset correction
    const constantXOffset = 5;  // Replace with your measured X offset
    const constantYOffset = 127;  // Replace with your measured Y offset

    // Subtract the constant offset
    const finalX = (adjustedX - offsetX - constantXOffset) + window.scrollX;
    const finalY = (adjustedY - offsetY - constantYOffset) + window.scrollY;

    // Project the red dot at the final adjusted coordinates
    const oldDot = document.getElementById('red-dot');
    if (oldDot) {
        oldDot.style.left = `${finalX}px`;
        oldDot.style.top = `${finalY}px`;
    } else {
        const dot = document.createElement('div');
        dot.id = 'red-dot';
        dot.style.position = 'absolute';
        dot.style.left = `${finalX}px`;
        dot.style.top = `${finalY}px`;
        dot.style.width = '10px';
        dot.style.height = '10px';
        dot.style.backgroundColor = 'red';
        dot.style.borderRadius = '50%';
        dot.style.zIndex = 9999;
        dot.style.pointerEvents = 'none';
        document.body.appendChild(dot);
    }

}



// Function to detect the word at the red dot's adjusted coordinates
function detectWordAtRedDot(x, y) {
    // Apply the same constant offsets as used in projectRedDot
    const pixelRatio = window.devicePixelRatio;

    const adjustedX = x / pixelRatio;  // Scale down the x-coordinate
    const adjustedY = y / pixelRatio;  // Scale down the y-coordinate

    const contentRect = document.documentElement.getBoundingClientRect();
    const offsetX = contentRect.left;
    const offsetY = contentRect.top;

    const constantXOffset = 5;  // Your X offset
    const constantYOffset = 127;  // Your Y offset

    // Apply the same final coordinate adjustments
    const finalX = (adjustedX - offsetX - constantXOffset) + window.scrollX;
    const finalY = (adjustedY - offsetY - constantYOffset) + window.scrollY;

    // Call the original detectWordAtCoordinates using the corrected coordinates
    return detectWordAtCoordinates(finalX, finalY);
}

// Function to detect the word at the current (adjusted) gaze coordinates
function detectWordAtCoordinates(x, y) {
    const range = document.caretRangeFromPoint(x, y);
    let closestWord = 'blank';

    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = range.startContainer;
        const text = textNode.textContent;
        const words = text.split(/\s+/).filter(w => w.length > 0);

        let closestDistance = 70;  // 70 pixels radius

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
    }

    console.log(`Detected word at coordinates (${x}, ${y}): ${closestWord}`);
    return closestWord;
}

// Function to replace the word in the DOM with its synonym
function replaceWordInDOM(originalWord, simplerWord) {
    const elements = document.body.getElementsByTagName('*');
    for (let el of elements) {
        for (let node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                const updatedText = node.nodeValue.replace(originalWord, simplerWord);
                node.nodeValue = updatedText;
                console.log(`Replaced '${originalWord}' with '${simplerWord}' in the DOM.`);
            }
        }
    }
}

// Messaging listener to handle popup.js requests for actions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'detectWord') {
        if (latestX !== null && latestY !== null) {
            console.log(`Detecting word at (${latestX}, ${latestY})`);
            const detectedWord = detectWordAtRedDot(latestX, latestY);  // Now using adjusted coordinates
            const context = getContextFromDOM(latestX, latestY);  // Get context
            sendWordToBackendViaSocket(detectedWord, context);  // Use WebSocket instead of fetch
            sendResponse({ word: detectedWord });
        } else {
            console.error("No valid gaze coordinates available.");
            sendResponse({ word: null });
        }
    } else if (message.action === 'startEyeOptimize') {
        storeOriginalStylesAndContent();
        fetchNonWikipediaContent();
        sendResponse({ status: 'Text optimized and scroll-based navigation added.' });
    } else if (message.action === 'resetPage') {
        restoreOriginalStylesAndContent();
        sendResponse({ status: 'Page reset to original state.' });
    }
});

// Function to get context around the detected word (e.g., 3 words before and after)
function getContextFromDOM(x, y) {
    const range = document.caretRangeFromPoint(x, y);
    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = range.startContainer;
        const text = textNode.textContent;
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const wordIndex = words.findIndex(word => text.includes(word));

        // Get 3 words before and after the detected word
        const contextStart = Math.max(0, wordIndex - 3);
        const contextEnd = Math.min(words.length, wordIndex + 4);
        const context = words.slice(contextStart, contextEnd).join(' ');

        console.log(`Context around the word: ${context}`);
        return context;
    }
    return '';
}
// Function to store original styles before modifying
let originalStyles = new Map();
let originalBodyContent = '';

// Store the original styles and content before modifying them
function storeOriginalStylesAndContent() {
    if (!originalBodyContent) {
        originalBodyContent = document.body.innerHTML; // Save the original body content
    }

    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
        if (!originalStyles.has(el)) {
            originalStyles.set(el, {
                fontSize: el.style.fontSize,
                lineHeight: el.style.lineHeight,
                textAlign: el.style.textAlign,
                display: el.style.display,
                margin: el.style.margin,
            });
        }
    });
}

// Restore the original styles and content
function restoreOriginalStylesAndContent() {
    if (originalBodyContent) {
        document.body.innerHTML = originalBodyContent; // Restore the original HTML content
    }

    originalStyles.forEach((styles, el) => {
        el.style.fontSize = styles.fontSize || '';
        el.style.lineHeight = styles.lineHeight || '';
        el.style.textAlign = styles.textAlign || '';
        el.style.display = styles.display || '';
        el.style.margin = styles.margin || '';
    });

    originalStyles.clear();
    originalBodyContent = '';
    document.body.style.overflow = 'scroll'; // Re-enable normal scroll
}

// Function to dynamically adjust text size and layout based on the viewport
function adjustTextLayout(container, scaleFactor = 1) {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const wordsPerRow = 8;  // Aim for 8 words per row for a more readable layout
    const rowsPerPage = 8;  // Aim for 8 rows per viewport for better spacing

    const averageWordLength = 6;
    const fontSizeBasedOnWidth = (viewportWidth - 40) / (wordsPerRow * averageWordLength);  // Adjust for padding

    const idealRowHeight = viewportHeight / rowsPerPage;
    const fontSizeBasedOnHeight = idealRowHeight * 0.8;

    const optimalFontSize = Math.min(fontSizeBasedOnWidth, fontSizeBasedOnHeight) * scaleFactor;

    container.style.fontSize = `${optimalFontSize}px`;
    container.style.lineHeight = `${idealRowHeight}px`;
    container.style.padding = '0 20px'; // Add horizontal padding for readability
}

// Function to style headers with blue accents
function styleHeaders(header) {
    const headerTag = header.tagName.toLowerCase();
    const headerScaleFactor = {
        'h1': 2.0,
        'h2': 1.8,
        'h3': 1.6,
        'h4': 1.4,
        'h5': 1.2,
        'h6': 1.1
    }[headerTag] || 1; // Adjust sizes based on header level

    // Apply education theme styles
    header.style.fontSize = `${parseFloat(header.style.fontSize) * headerScaleFactor}px`;
    header.style.color = '#0056b3';  // Blue accents for headers
    header.style.fontWeight = 'bold';
    header.style.borderBottom = '2px solid #0056b3';  // Blue underline for headers
    header.style.paddingBottom = '10px';  // Padding below the header
    header.style.marginTop = '40px';  // Add spacing above headers
    header.style.marginBottom = '20px';  // Add spacing below headers
}

// Function to modify text content while maintaining the correct order of headers and paragraphs
function modifyTextContentInOrder(contentElements, scaleFactor = 1) {
    const container = document.createElement('div');
    container.id = 'textContainer';
    
    container.style.color = '#333333';  // Dark grey text for readability
    container.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'; // Clean font family
    container.style.borderRadius = '0';  // No rounded corners to span the full screen
    container.style.boxShadow = 'none';  // Remove box shadow for full-width text
    container.style.margin = '0';  // No margin to span the entire screen horizontally
    container.style.padding = '0 20px';  // Add horizontal padding for readability
    container.style.lineHeight = '1.6';  // Increased line height for readability

    contentElements.forEach(element => {
        const tagName = element.tagName.toLowerCase();
        const newElement = document.createElement(tagName);

        // Handle paragraphs
        if (tagName === 'p') {
            newElement.textContent = element.textContent;
            newElement.style.marginBottom = '20px';  // Add spacing between paragraphs
            container.appendChild(newElement);
        }

        // Handle headers with educational blue accents
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            newElement.textContent = element.textContent;
            styleHeaders(newElement);  // Apply styles to headers
            container.appendChild(newElement);
        }
    });

    document.body.innerHTML = ''; // Clear the current content and display only the new one
    document.body.appendChild(container);

    adjustTextLayout(container, scaleFactor);

    document.body.style.overflow = 'scroll'; // Re-enable scrolling
}

// Function to fetch and modify non-Wikipedia content
function fetchNonWikipediaContent() {
    const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');

    if (contentElements.length === 0) {
        console.error("No paragraphs or headers found to modify on the non-Wikipedia page.");
        return;
    }

    modifyTextContentInOrder(contentElements, 1); // Maintain order for non-Wikipedia pages
}
