// Debugging: Log that the content script has loaded
console.log("Content script loaded and ready to receive messages.");

// Check if variables are already defined and persist them globally
if (typeof currentPageIndex === 'undefined') {
    var currentPageIndex = 0; 
}

if (typeof paginatedText === 'undefined') {
    var paginatedText = [];  
}

if (typeof originalStyles === 'undefined') {
    var originalStyles = new Map();  
}

// Store the original styles before modifying them
function storeOriginalStyles(elements) {
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

// Restore the original styles
function restoreOriginalStyles() {
    console.log("Restoring original styles...");

    originalStyles.forEach((styles, el) => {
        el.style.fontSize = styles.fontSize || '';
        el.style.lineHeight = styles.lineHeight || '';
        el.style.textAlign = styles.textAlign || '';
        el.style.display = styles.display || '';
        el.style.margin = styles.margin || '';
    });
    originalStyles.clear();

    // Remove navigation arrows
    removeNavigationArrows();
    document.body.style.overflow = 'scroll';

    console.log("Original styles restored and navigation arrows removed.");
}

// Function to modify text size and ensure even spacing across the page
function modifyTextContent() {
    console.log("Modifying text content...");

    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    let totalWords = 0;
    let currentWords = [];

    storeOriginalStyles(textElements);  // Store original styles

    textElements.forEach((element) => {
        // Skip ads or irrelevant content
        if (element.closest('iframe, .ad, .advertisement, .banner')) {
            console.log("Skipping ad element");
            return;
        }

        const words = element.innerText.split(/\s+/).filter(Boolean);
        const tagName = element.tagName.toLowerCase();

        // Adjust words based on the type of element 
        if (['p'].includes(tagName)) {
            totalWords += words.length;
            currentWords.push({ element, wordCount: words.length, type: 'paragraph' });
        } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            currentWords.push({ element, wordCount: Math.min(words.length, 10), type: 'header' });
            totalWords += Math.min(words.length, 10); 
        }

        if (totalWords >= 50) { 
            paginatedText.push([...currentWords]);
            currentWords = [];
            totalWords = 0;
        }
    });

    // Add the remaining content as the last page
    if (currentWords.length > 0) {
        paginatedText.push([...currentWords]);
    }

    showCurrentPage();  
}

// Function to dynamically calculate font size and adjust spacing based on viewport
function adjustTextLayout(elements) {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const wordsPerRow = (7 + 10) / 2;  
    const rowsPerPage = (6 + 8) / 2;  

    const averageWordLength = 6;  
    const fontSizeBasedOnWidth = viewportWidth / (wordsPerRow * averageWordLength);

    const idealRowHeight = viewportHeight / rowsPerPage;
    const fontSizeBasedOnHeight = idealRowHeight * 0.8;  

    const optimalFontSize = Math.min(fontSizeBasedOnWidth, fontSizeBasedOnHeight);

    let previousElementWasHeader = false;

    elements.forEach((el) => {
        const element = el.element;
        const tagName = element.tagName.toLowerCase();
        let fontSize = optimalFontSize;

        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            fontSize *= 1.5;  
            element.style.textAlign = 'center';  
            element.style.marginBottom = '20px'; 
            element.style.marginTop = previousElementWasHeader ? '20px' : '0'; 
            previousElementWasHeader = true;
        } else {
            element.style.textAlign = 'left';  
            element.style.marginTop = '0';
            previousElementWasHeader = false;
        }

        element.style.fontSize = `${fontSize}px`;
        element.style.lineHeight = `${idealRowHeight}px`;  
        element.style.margin = '10px 0';  
    });

    document.body.style.overflow = 'hidden';  
}

// Function to show the current page of text
function showCurrentPage() {
    const allTextElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    allTextElements.forEach((el) => el.style.display = 'none');

    const elementsToShow = paginatedText[currentPageIndex];
    adjustTextLayout(elementsToShow);  

    elementsToShow.forEach((el) => el.element.style.display = 'block');
}

// Function to handle next page navigation
function nextPage() {
    if (currentPageIndex < paginatedText.length - 1) {
        currentPageIndex++;
        showCurrentPage();
    }
}

// Function to handle previous page navigation
function prevPage() {
    if (currentPageIndex > 0) {
        currentPageIndex--;
        showCurrentPage();
    }
}

// Function to create navigation arrows
function createNavigationArrows() {
    console.log("Creating navigation arrows...");

    // Check if the arrows already exist, if so, do not create them again
    if (!document.getElementById('leftArrow') && !document.getElementById('rightArrow')) {
        const leftArrow = document.createElement('div');
        leftArrow.innerHTML = '&larr;';
        leftArrow.style.position = 'fixed';
        leftArrow.style.bottom = '20px';
        leftArrow.style.left = '20px';
        leftArrow.style.fontSize = '48px';
        leftArrow.style.cursor = 'pointer';
        leftArrow.onclick = prevPage;
        leftArrow.id = 'leftArrow';
        document.body.appendChild(leftArrow);

        const rightArrow = document.createElement('div');
        rightArrow.innerHTML = '&rarr;';
        rightArrow.style.position = 'fixed';
        rightArrow.style.bottom = '20px';
        rightArrow.style.right = '20px';
        rightArrow.style.fontSize = '48px';
        rightArrow.style.cursor = 'pointer';
        rightArrow.onclick = nextPage;
        rightArrow.id = 'rightArrow';
        document.body.appendChild(rightArrow);
    }
}

// Function to remove navigation arrows
function removeNavigationArrows() {
    console.log("Removing navigation arrows...");

    const leftArrow = document.getElementById('leftArrow');
    const rightArrow = document.getElementById('rightArrow');

    if (leftArrow) {
        leftArrow.remove();
        console.log("Left arrow removed.");
    }

    if (rightArrow) {
        rightArrow.remove();
        console.log("Right arrow removed.");
    }
}

// Listener for the message from the popup to trigger the function
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received from popup:", message);

    if (message.action === 'startEyeOptimize') {
        console.log("Starting eye-optimized view");

        modifyTextContent();
        createNavigationArrows();

        sendResponse({ status: 'Text optimized and navigation added.' });
    }

    if (message.action === 'resetPage') {
        console.log("Reset button clicked, restoring original styles...");
        restoreOriginalStyles();
        sendResponse({ status: 'Page reset to original state.' });
    }
});
