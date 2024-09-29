const BACKEND_PORT = 5000;

const NEXT_JS_API_URL = 'https://localhost:3000/api/auth/chromeAuth.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startGoogleAuth') {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError) {
        console.error('Sign-in error:', chrome.runtime.lastError.message);
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        authenticateWithNextJs(token, sendResponse);
      }
    });
    return true; // To allow async sendResponse
  }
});

function authenticateWithNextJs(token, sendResponse) {
  fetch(NEXT_JS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        throw new Error(data.error);
      }
      // Store user information in chrome storage
      chrome.storage.local.set({ userInfo: data.session.user, token: token }, () => {
        sendResponse({ success: true, userInfo: data.session.user });
      });
    })
    .catch(error => {
      console.error('Error authenticating with Next.js:', error);
      sendResponse({ error: error.message });
    });
}
  
chrome.action.onClicked.addListener(function() {
    chrome.tabs.create({url: 'index.html'});
  });

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
});
