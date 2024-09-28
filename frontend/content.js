// Log that the content script has loaded
console.log("Content script loaded and ready to receive messages.");

// Check if variables are already defined and persist them globally
if (typeof currentPageIndex === 'undefined') {
    var currentPageIndex = 0; 
}

if (typeof paginatedText === 'undefined') {
    var paginatedText = [];  

// Check and declare words per row and rows per page only if not already declared
if (typeof minWordsPerRow === 'undefined') {
    var minWordsPerRow = 7; 
}

if (typeof maxWordsPerRow === 'undefined') {
    var maxWordsPerRow = 10;  
}
if (typeof minRowsPerPage === 'undefined') {
    var minRowsPerPage = 6;  
}

if (typeof maxRowsPerPage === 'undefined') {
    var maxRowsPerPage = 8;   
}
// Function to modify text size and ensure even spacing across the page
function modifyTextContent() {
    console.log("Modifying text content...");

    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    let totalWords = 0;
    let currentWords = [];

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

    showCurrentPage();  // Show the first page
}

// Function to dynamically calculate font size and adjust spacing based on viewport
function adjustTextLayout(elements) {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Calculate the available space for each row (approximate word length/row width)
    const wordsPerRow = (minWordsPerRow + maxWordsPerRow) / 2;  // Average words per row
    const rowsPerPage = (minRowsPerPage + maxRowsPerPage) / 2;  // Average rows per page

    // Calculate the ideal font size based on viewport width and word length
    const averageWordLength = 6;  // Approximate average word length (in characters)
    const fontSizeBasedOnWidth = viewportWidth / (wordsPerRow * averageWordLength);

    // Calculate ideal row height to fit the target number of rows
    const idealRowHeight = viewportHeight / rowsPerPage;
    const fontSizeBasedOnHeight = idealRowHeight * 0.8;  // 0.8 to adjust for line height

    // Use the smaller font size to ensure content fits both width and height constraints
    const optimalFontSize = Math.min(fontSizeBasedOnWidth, fontSizeBasedOnHeight);

    let previousElementWasHeader = false;

    elements.forEach((el) => {
        const element = el.element;
        const tagName = element.tagName.toLowerCase();
        let fontSize = optimalFontSize;

        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            fontSize *= 1.5;  // Headers should be larger
            element.style.textAlign = 'center';  // Center the header text horizontally
            element.style.marginBottom = '20px'; // Add space below headers
            element.style.marginTop = previousElementWasHeader ? '20px' : '0'; // Ensure spacing between headers
            previousElementWasHeader = true;
        } else {
            element.style.textAlign = 'left';  // Paragraphs should be left-aligned
            element.style.marginTop = '0';
            previousElementWasHeader = false;
        }

        // Set font size dynamically
        element.style.fontSize = `${fontSize}px`;
        element.style.lineHeight = `${idealRowHeight}px`;  // Adjust line height to fit rows
        element.style.margin = '10px 0';  // Add spacing between paragraphs and headers
    });

    // Ensure the page fits within the viewport (no scrolling)
    document.body.style.overflow = 'hidden';  // Disable scrolling
}

// Function to show the current page of text
function showCurrentPage() {
    const allTextElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    allTextElements.forEach((el) => el.style.display = 'none');

    const elementsToShow = paginatedText[currentPageIndex];
    adjustTextLayout(elementsToShow);  // Adjust layout dynamically

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

    // Left arrow for previous page
    const leftArrow = document.createElement('div');
    leftArrow.innerHTML = '&larr;';
    leftArrow.style.position = 'fixed';
    leftArrow.style.bottom = '20px';
    leftArrow.style.left = '20px';
    leftArrow.style.fontSize = '48px';
    leftArrow.style.cursor = 'pointer';
    leftArrow.onclick = prevPage;
    document.body.appendChild(leftArrow);

    // Right arrow for next page
    const rightArrow = document.createElement('div');
    rightArrow.innerHTML = '&rarr;';
    rightArrow.style.position = 'fixed';
    rightArrow.style.bottom = '20px';
    rightArrow.style.right = '20px';
    rightArrow.style.fontSize = '48px';
    rightArrow.style.cursor = 'pointer';
    rightArrow.onclick = nextPage;
    document.body.appendChild(rightArrow);
}

// Listener for the message from the popup to trigger the function
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received from popup:", message);

    if (message.action === 'startEyeOptimize') {
        console.log("Starting eye-optimized view");

        // Modify the page content and add navigation arrows
        modifyTextContent();
        createNavigationArrows();

        sendResponse({ status: 'Text optimized and navigation added.' });
    }
});
