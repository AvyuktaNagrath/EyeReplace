// Debugging: Log that the content script has loaded
console.log("Content script loaded and ready to receive messages.");

// Now that the Socket.IO client is self-hosted, we can directly create the Socket.IO connection
const socket = io('http://143.215.63.97:5000');

// Event listener for WebSocket connection
socket.on('connect', function () {
    console.log("Socket.IO connection established with Flask backend.");
});

// Event listener for receiving messages from the Flask backend
socket.on('screen_gaze_data', function (data) {
    if (data.x !== undefined && data.y !== undefined) {
        console.log(`Received Screen Gaze: Coordinates: (${data.x}, ${data.y})`);

        // Project red dot on the screen using these coordinates
        projectRedDot(data.x, data.y);
    }
});

// Event listener for WebSocket errors
socket.on('connect_error', function (error) {
    console.error("Socket.IO connection error:", error);
});

// Event listener for WebSocket closing
socket.on('disconnect', function () {
    console.log("Socket.IO connection closed.");
});

// Function to project red dot using screen gaze coordinates
function projectRedDot(x, y) {
    // Remove old red dot if it exists
    const oldDot = document.getElementById('red-dot');
    if (oldDot) {
        oldDot.remove();
    }

    // Create new red dot
    const dot = document.createElement('div');
    dot.id = 'red-dot';
    dot.style.position = 'absolute';
    dot.style.left = `${x + window.scrollX}px`;  // Adjust for scrolling position
    dot.style.top = `${y + window.scrollY}px`;  // Adjust for scrolling position
    dot.style.width = '10px';
    dot.style.height = '10px';
    dot.style.backgroundColor = 'red';
    dot.style.borderRadius = '50%';
    dot.style.zIndex = 9999;
    dot.style.pointerEvents = 'none';
    document.body.appendChild(dot);
}

// Messaging listener to handle the popup button clicks
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received from popup:", message);

    if (message.action === 'startEyeOptimize') {
        console.log("Starting eye-optimized view");

        storeOriginalStylesAndContent();
        fetchNonWikipediaContent();

        sendResponse({ status: 'Text optimized and scroll-based navigation added.' });
    }

    if (message.action === 'resetPage') {
        console.log("Reset button clicked, restoring original styles...");
        restoreOriginalStylesAndContent(); 
        sendResponse({ status: 'Page reset to original state.' });
    }
});

// Check if variables are already defined and persist them globally
if (typeof originalStyles === 'undefined') {
    var originalStyles = new Map();  
}

if (typeof originalBodyContent === 'undefined') {
    var originalBodyContent = ''; // Store the original body content
}

// Store the original styles and content before modifying them
function storeOriginalStylesAndContent() {
    console.log("Storing original styles and content...");

    if (!originalBodyContent) {
        originalBodyContent = document.body.innerHTML; // Save the original body content
        console.log("Original body content stored:", originalBodyContent);  // Debugging: Log the stored content
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
    console.log("Original styles stored:", originalStyles);  // Debugging: Log the stored styles
}

// Restore the original styles and content
function restoreOriginalStylesAndContent() {
    console.log("Restoring original styles and content...");

    if (originalBodyContent) {
        document.body.innerHTML = originalBodyContent; // Restore the original HTML content
        console.log("Original body content restored.");  // Debugging: Log the restored content
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

    console.log("Original styles and content restored.");
}

// Function to dynamically adjust text size and layout based on the viewport
function adjustTextLayout(container, scaleFactor = 1) {
    console.log("Adjusting text layout...");

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
    console.log("Modifying text content while maintaining order...");

    if (!contentElements || contentElements.length === 0) {
        console.error("No content elements found for modification.");
        return;
    }

    const container = document.createElement('div');
    container.id = 'textContainer';
    
    // Apply a gradient background to assist in reading flow
    container.style.color = '#333333';  // Dark grey text for readability
    container.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'; // Clean font family
    container.style.borderRadius = '0';  // No rounded corners to span the full screen
    container.style.boxShadow = 'none';  // Remove box shadow for full-width text
    container.style.margin = '0';  // No margin to span the entire screen horizontally
    container.style.padding = '0 20px';  // Add horizontal padding for readability
    container.style.lineHeight = '1.6';  // Increased line height for readability

    // Iterate over all elements (headers, paragraphs) and maintain order
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
    console.log("Fetching non-Wikipedia content...");

    const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');

    if (contentElements.length === 0) {
        console.error("No paragraphs or headers found to modify on the non-Wikipedia page.");
        return;
    }

    console.log("Content elements found in non-Wikipedia page:", contentElements);

    modifyTextContentInOrder(contentElements, 1); // Maintain order for non-Wikipedia pages
}
