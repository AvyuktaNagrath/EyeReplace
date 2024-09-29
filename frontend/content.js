// Debugging: Log that the content script has loaded
console.log("Content script loaded and ready to receive messages.");

let latestX = null;  // Store the latest X coordinate
let latestY = null;  // Store the latest Y coordinate
let storedCoordinates = [];  // Array to hold recent coordinates for focus checking

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
        console.log(`Received Screen Gaze Coordinates: (${latestX}, ${latestY})`);
        
        // Store coordinates for focus checking
        checkFocus(latestX, latestY);
        
        // Continuously project red dot at the latest gaze coordinates
        projectRedDot(latestX, latestY);
    }
});

// Function to project red dot using screen gaze coordinates
function projectRedDot(x, y) {
    const oldDot = document.getElementById('red-dot');
    if (oldDot) {
        oldDot.style.left = `${x + window.scrollX}px`;  // Adjust for scrolling position
        oldDot.style.top = `${y + window.scrollY}px`;   // Adjust for scrolling position
    } else {
        // Create new red dot if it doesn't exist
        const dot = document.createElement('div');
        dot.id = 'red-dot';
        dot.style.position = 'absolute';
        dot.style.left = `${x + window.scrollX}px`;  // Adjust for scrolling position
        dot.style.top = `${y + window.scrollY}px`;   // Adjust for scrolling position
        dot.style.width = '10px';
        dot.style.height = '10px';
        dot.style.backgroundColor = 'red';
        dot.style.borderRadius = '50%';
        dot.style.zIndex = 9999;
        dot.style.pointerEvents = 'none';
        document.body.appendChild(dot);
    }
}

// Function to check if gaze coordinates are focused
function checkFocus(x, y) {
    storedCoordinates.push({ x, y, time: Date.now() });

    // Keep only the last 100 coordinates for checking focus
    if (storedCoordinates.length > 100) {
        storedCoordinates.shift();
    }

    // Check if the last coordinates are within 50 pixels for 2 seconds
    const now = Date.now();
    const recentCoords = storedCoordinates.filter(coord => now - coord.time <= 2000);

    if (recentCoords.length > 0) {
        const firstCoord = recentCoords[0];
        const distance = Math.sqrt(Math.pow(x - firstCoord.x, 2) + Math.pow(y - firstCoord.y, 2));

        if (distance <= 50) {
            // Call the word detection functionality if conditions are met
            const detectedWord = detectWordAtCoordinates(x, y);
            sendDetectedWord(detectedWord);
        }
    }
}

// Function to detect the word at the current gaze coordinates
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

// Function to send the detected word to the popup
function sendDetectedWord(word) {
    chrome.runtime.sendMessage({ action: 'detectedWord', word: word });
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
