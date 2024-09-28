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

    // Save the entire original body content before making modifications
    if (!originalBodyContent) {
        originalBodyContent = document.body.innerHTML; // Save the original body content
        console.log("Original body content stored:", originalBodyContent);  // Debugging: Log the stored content
    }

    // Store the original styles of all elements on the page
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

    // Restore the original body content
    if (originalBodyContent) {
        document.body.innerHTML = originalBodyContent; // Restore the original HTML content
        console.log("Original body content restored.");  // Debugging: Log the restored content
    }

    // Restore individual styles for elements (if applicable)
    originalStyles.forEach((styles, el) => {
        el.style.fontSize = styles.fontSize || '';
        el.style.lineHeight = styles.lineHeight || '';
        el.style.textAlign = styles.textAlign || '';
        el.style.display = styles.display || '';
        el.style.margin = styles.margin || '';
    });

    // Clear the stored styles and content after restoring
    originalStyles.clear();
    originalBodyContent = '';

    document.body.style.overflow = 'scroll'; // Re-enable normal scroll

    console.log("Original styles and content restored.");
}

// Function to dynamically adjust text size and layout based on the viewport
function adjustTextLayout() {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Approximate layout for 50 words per viewport
    const wordsPerRow = 7;  // Aim for 7-10 words per row
    const rowsPerPage = 7;  // Aim for 6-8 rows per viewport

    // Calculate font size based on viewport dimensions
    const averageWordLength = 6; // Average word length in characters
    const fontSizeBasedOnWidth = viewportWidth / (wordsPerRow * averageWordLength);

    // Calculate line height based on viewport height and number of rows
    const idealRowHeight = viewportHeight / rowsPerPage;
    const fontSizeBasedOnHeight = idealRowHeight * 0.8;  // Adjust font size to fit the rows properly

    // Choose the smaller of the two calculated font sizes to fit both width and height
    const optimalFontSize = Math.min(fontSizeBasedOnWidth, fontSizeBasedOnHeight);

    // Apply the calculated font size to the text container
    const container = document.getElementById('textContainer');
    container.style.fontSize = `${optimalFontSize}px`;
    container.style.lineHeight = `${idealRowHeight}px`; // Ensure proper line height for the text
    container.style.padding = '10px'; // Add some padding for better readability
}

// Function to modify text content and adjust it to fit approximately 50 words per viewport
function modifyTextContent(combinedText) {
    console.log("Modifying text content...");

    if (!combinedText || combinedText.trim() === '') {
        console.error("No content found for modification. Combined text is empty.");
        return;
    }

    // Create a container to display the large combined paragraph
    const container = document.createElement('div');
    container.id = 'textContainer';
    container.style.backgroundColor = '#f9f9f9'; // Add background color for visibility
    container.style.color = 'black'; // Ensure text color is visible
    container.style.height = '100vh'; // Set height to viewport height for visibility

    const paragraphElement = document.createElement('p');
    paragraphElement.textContent = combinedText;

    container.appendChild(paragraphElement);
    document.body.innerHTML = ''; // Clear the current content and display only the new one
    document.body.appendChild(container);

    // Adjust the layout of the text to fit 50 words per viewport
    adjustTextLayout();

    // Allow normal scrolling
    document.body.style.overflow = 'scroll';
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
            // Parse the response to get the page HTML
            const htmlCode = response["parse"]["text"]["*"];
            const parser = new DOMParser();
            const parsedHtml = parser.parseFromString(htmlCode, "text/html");

            // Select all the paragraphs from the Wikipedia page
            const paragraphs = parsedHtml.querySelectorAll("p");
            let combinedText = "";

            // Convert all paragraphs to plain text and combine them
            paragraphs.forEach(paragraph => {
                combinedText += paragraph.textContent + " ";
            });

            console.log("Combined Wikipedia Text: ", combinedText);

            // Use the combined text for your purposes (scrollable content, etc.)
            modifyTextContent(combinedText);
        })
        .catch(function(error) {
            console.error("Error fetching Wikipedia content:", error);
        });
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

// Function to handle non-Wikipedia pages
function modifyTextContentNonWikipedia() {
    console.log("Modifying non-Wikipedia content...");

    // Select all paragraphs and headers from the current page
    const paragraphs = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');

    if (paragraphs.length === 0) {
        console.error("No paragraphs or headers found to modify on the non-Wikipedia page.");
        return;
    }

    let combinedText = "";

    paragraphs.forEach(paragraph => {
        combinedText += paragraph.textContent + " ";
    });

    console.log("Combined Text for non-Wikipedia:", combinedText);

    modifyTextContent(combinedText);
}

// Listener for the message from the popup to trigger the function
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received from popup:", message);

    if (message.action === 'startEyeOptimize') {
        console.log("Starting eye-optimized view");

        // Store original styles and content before modifying the page
        storeOriginalStylesAndContent();

        const currentURL = window.location.href;
        const pageTitle = extractWikipediaTitleFromURL(currentURL);

        if (pageTitle) {
            // Fetch Wikipedia content based on the current page's title
            fetchWikipediaContent(pageTitle);
        } else {
            console.error("Unable to extract page title from URL.");
            modifyTextContentNonWikipedia();  // If it's not Wikipedia, handle as normal content
        }

        sendResponse({ status: 'Text optimized and scroll-based navigation added.' });
    }

    if (message.action === 'resetPage') {
        console.log("Reset button clicked, restoring original styles...");
        restoreOriginalStylesAndContent(); // Restore original content and styles
        sendResponse({ status: 'Page reset to original state.' });
    }
});
