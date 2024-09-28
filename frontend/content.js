// Debugging: Log that the content script has loaded
console.log("Content script loaded and ready to receive messages.");

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

// Function to fetch and process content for both Wikipedia and non-Wikipedia pages
function fetchAndModifyContent() {
    console.log("Fetching and modifying content...");

    const currentURL = window.location.href;
    const pageTitle = extractWikipediaTitleFromURL(currentURL);

    if (pageTitle) {
        fetchWikipediaContent(pageTitle);  // Wikipedia content fetching and modification
    } else {
        fetchNonWikipediaContent();  // For non-Wikipedia content
    }
}

// Function to fetch Wikipedia content using the Wikipedia API and apply uniform formatting
function fetchWikipediaContent(pageTitle) {
    console.log(`Fetching content for Wikipedia page: ${pageTitle}`);
    const url = `https://en.wikipedia.org/w/api.php?action=parse&format=json&origin=*&page=${encodeURIComponent(pageTitle)}`;

    fetch(url)
        .then(function(response) {
            return response.json();
        })
        .then(function(response) {
            if (response.error) {
                console.error("Error from Wikipedia API:", response.error);
                return;
            }
            const htmlCode = response["parse"]["text"]["*"];
            const parser = new DOMParser();
            const parsedHtml = parser.parseFromString(htmlCode, "text/html");

            // Remove annotation elements (sup tags with reference class)
            const annotations = parsedHtml.querySelectorAll("sup.reference");
            annotations.forEach(annotation => annotation.remove());

            const contentElements = parsedHtml.querySelectorAll("p, h1, h2, h3, h4, h5, h6");

            console.log("Content elements fetched from Wikipedia:", contentElements);

            modifyTextContentInOrder(contentElements, 1); // Maintain order for Wikipedia
        })
        .catch(function(error) {
            console.error("Error fetching Wikipedia content:", error);
        });
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

// Function to extract the Wikipedia page title from the current tab's URL
function extractWikipediaTitleFromURL(url) {
    const regex = /wikipedia\.org\/wiki\/([^#?]+)/;
    const match = url.match(regex);
    if (match && match[1]) {
        return decodeURIComponent(match[1].replace(/_/g, ' '));
    }
    return null;
}

// Listener for the message from the popup to trigger the function
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received from popup:", message);

    if (message.action === 'startEyeOptimize') {
        console.log("Starting eye-optimized view");

        storeOriginalStylesAndContent();
        fetchAndModifyContent();

        sendResponse({ status: 'Text optimized and scroll-based navigation added.' });
    }

    if (message.action === 'resetPage') {
        console.log("Reset button clicked, restoring original styles...");
        restoreOriginalStylesAndContent(); 
        sendResponse({ status: 'Page reset to original state.' });
    }
});
