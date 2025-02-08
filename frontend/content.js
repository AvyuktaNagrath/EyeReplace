let latestX = null;
let latestY = null;
let currentWord = null;
let focusStartTime = null;
let lastWordX = null;
let lastWordY = null;

let selectedModeInContent = 'simplify';
let languageESL = 'Spanish';

const FOCUS_THRESHOLD_MS = 2000;
const FOCUS_RADIUS_PX = 50;

const socket = io('http://143.215.63.97:5000');

socket.on('connect', function () {
    console.log("Socket.IO connection established with Flask backend.");
});

socket.on('screen_gaze_data', function (data) {
    if (data.x !== undefined && data.y !== undefined) {
        latestX = data.x;
        latestY = data.y;
        const detectedWord = detectWordAtRedDot(latestX, latestY);
        if (detectedWord !== currentWord) {
            currentWord = detectedWord;
            focusStartTime = Date.now();
            const wordPosition = getWordCenterPosition(detectedWord);
            lastWordX = wordPosition.x;
            lastWordY = wordPosition.y;
        } else {
            if (Date.now() - focusStartTime >= FOCUS_THRESHOLD_MS) {
                triggerWordReplacement(currentWord);
                focusStartTime = null;
            }
        }
    }
});

function isWithinFocusRadius(x, y, wordX, wordY) {
    const distance = Math.sqrt(Math.pow(x - wordX, 2) + Math.pow(y - wordY, 2));
    return distance <= FOCUS_RADIUS_PX;
}

function triggerWordReplacement(word) {
    console.log(`Focusing on '${word}' for more than 1 second. Replacing...`);
    const context = getContextFromDOM(latestX, latestY);
    sendWordToBackendViaSocket(word, context);
}

function getWordCenterPosition(word) {
    const range = document.createRange();
    const textNode = getTextNodeByWord(word);
    if (textNode) {
        range.selectNodeContents(textNode);
        const rect = range.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    } else {
        return { x: 0, y: 0 };
    }
}

function getTextNodeByWord(word) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function(node) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(word)) {
                return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
        }
    });
    while (walker.nextNode()) {
        if (walker.currentNode.textContent.includes(word)) {
            return walker.currentNode;
        }
    }
    return null;
}

function sendWordToBackendViaSocket(word, context) {
    if (!word || word === "blank") {
        console.log("No valid word detected, skipping socket emission.");
    } else {
        let messageData = {
            word: word,
            context: context,
            mode: selectedModeInContent
        };
        if (selectedModeInContent === 'esl') {
            messageData.language = languageESL;
        }
        socket.emit('word_detection', messageData);
        console.log(`Sent word: ${word}, with context: ${context}, mode: ${selectedModeInContent}, language: ${languageESL}`);
    }
}

function projectRedDot(x, y) {
    const pixelRatio = window.devicePixelRatio;
    const adjustedX = x / pixelRatio;
    const adjustedY = y / pixelRatio;
    const contentRect = document.documentElement.getBoundingClientRect();
    const offsetX = contentRect.left;
    const offsetY = contentRect.top;
    const constantXOffset = 5;
    const constantYOffset = 137;
    const finalX = (adjustedX - offsetX - constantXOffset) + window.scrollX;
    const finalY = (adjustedY - offsetY - constantYOffset) + window.scrollY;
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

socket.on('synonym_response', function (data) {
    const { originalWord, simpler_word } = data;
    console.log(`Received synonym for '${originalWord}': '${simpler_word}'`);
    replaceWordInDOM(originalWord, simpler_word);
});

function detectWordAtRedDot(x, y) {
    const pixelRatio = window.devicePixelRatio;
    const adjustedX = x / pixelRatio;
    const adjustedY = y / pixelRatio;
    const contentRect = document.documentElement.getBoundingClientRect();
    const offsetX = contentRect.left;
    const offsetY = contentRect.top;
    const constantXOffset = 5;
    const constantYOffset = 137;
    const finalX = (adjustedX - offsetX - constantXOffset) + window.scrollX;
    const finalY = (adjustedY - offsetY - constantYOffset) + window.scrollY;
    return detectWordAtCoordinates(finalX, finalY);
}

function detectWordAtCoordinates(x, y) {
    const range = document.caretRangeFromPoint(x, y);
    let closestWord = 'blank';
    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = range.startContainer;
        const text = textNode.textContent;
        const words = text.split(/\s+/).filter(w => w.length > 0);
        let closestDistance = 70;
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
    return closestWord;
}

function replaceWordInDOM(originalWord, simplerWord) {
    const elements = document.body.getElementsByTagName('*');
    const regex = new RegExp(`\\b${originalWord}\\b`, 'g');
    for (let el of elements) {
        for (let node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                const updatedText = node.nodeValue.replace(regex, simplerWord);
                if (updatedText !== node.nodeValue) {
                    node.nodeValue = updatedText;
                    console.log(`Replaced '${originalWord}' with '${simplerWord}' in the DOM.`);
                }
            }
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'detectWord') {
        if (latestX !== null && latestY !== null) {
            const detectedWord = detectWordAtRedDot(latestX, latestY);
            const context = getContextFromDOM(latestX, latestY);
            sendWordToBackendViaSocket(detectedWord, context);
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
    } else if (message.action === 'setMode' && message.mode) {
        selectedModeInContent = message.mode;
        console.log(`Mode set to: ${selectedModeInContent} in content.js`);
        sendResponse({ status: `Mode set to ${selectedModeInContent}` });
    } else if (message.action === 'setESL' && message.language) {
        languageESL = message.language;
        console.log(`ESL language set to: ${languageESL} in content.js`);
        sendResponse({ status: `Language set to ${languageESL}` });
    }
});

function getContextFromDOM(x, y) {
    const range = document.caretRangeFromPoint(x, y);
    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = range.startContainer;
        const text = textNode.textContent;
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const wordIndex = words.findIndex(word => text.includes(word));
        const contextStart = Math.max(0, wordIndex - 3);
        const contextEnd = Math.min(words.length, wordIndex + 4);
        const context = words.slice(contextStart, contextEnd).join(' ');
        console.log(`Context around the word: ${context}`);
        return context;
    }
    return '';
}

let originalStyles = new Map();
let originalBodyContent = '';

function storeOriginalStylesAndContent() {
    if (!originalBodyContent) {
        originalBodyContent = document.body.innerHTML;
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

function restoreOriginalStylesAndContent() {
    if (originalBodyContent) {
        document.body.innerHTML = originalBodyContent;
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
    document.body.style.overflow = 'scroll';
}

function adjustTextLayout(container, scaleFactor = 1) {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const wordsPerRow = 8;
    const rowsPerPage = 8;
    const averageWordLength = 6;
    const fontSizeBasedOnWidth = (viewportWidth - 40) / (wordsPerRow * averageWordLength);
    const idealRowHeight = viewportHeight / rowsPerPage;
    const fontSizeBasedOnHeight = idealRowHeight * 0.8;
    const optimalFontSize = Math.min(fontSizeBasedOnWidth, fontSizeBasedOnHeight) * scaleFactor;
    container.style.fontSize = `${optimalFontSize}px`;
    container.style.lineHeight = `${idealRowHeight}px`;
    container.style.padding = '0 20px';
}

function styleHeaders(header) {
    const headerTag = header.tagName.toLowerCase();
    const headerScaleFactor = {
        'h1': 2.0,
        'h2': 1.8,
        'h3': 1.6,
        'h4': 1.4,
        'h5': 1.2,
        'h6': 1.1
    }[headerTag] || 1;
    header.style.fontSize = `${parseFloat(header.style.fontSize) * headerScaleFactor}px`;
    header.style.color = '#0056b3';
    header.style.fontWeight = 'bold';
    header.style.borderBottom = '2px solid #0056b3';
    header.style.paddingBottom = '10px';
    header.style.marginTop = '40px';
    header.style.marginBottom = '20px';
}

function modifyTextContentInOrder(contentElements, scaleFactor = 1) {
    const container = document.createElement('div');
    container.id = 'textContainer';
    container.style.color = '#333333';
    container.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
    container.style.borderRadius = '0';
    container.style.boxShadow = 'none';
    container.style.margin = '0';
    container.style.padding = '0 20px';
    container.style.lineHeight = '1.6';
    contentElements.forEach(element => {
        const tagName = element.tagName.toLowerCase();
        const newElement = document.createElement(tagName);
        if (tagName === 'p') {
            newElement.textContent = element.textContent;
            newElement.style.marginBottom = '20px';
            container.appendChild(newElement);
        }
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            newElement.textContent = element.textContent;
            styleHeaders(newElement);
            container.appendChild(newElement);
        }
    });
    document.body.innerHTML = '';
    document.body.appendChild(container);
    adjustTextLayout(container, scaleFactor);
    document.body.style.overflow = 'scroll';
}

function fetchNonWikipediaContent() {
    const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    if (contentElements.length === 0) {
        console.error("No paragraphs or headers found to modify on the non-Wikipedia page.");
        return;
    }
    modifyTextContentInOrder(contentElements, 1);
}
