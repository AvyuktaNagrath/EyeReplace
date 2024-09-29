document.addEventListener('DOMContentLoaded', () => {
    console.log("Popup script loaded");

    const signInButton = document.getElementById('signInButton');
    const signInStatus = document.getElementById('signInStatus');
    const userProfileSection = document.createElement('div');
    userProfileSection.id = 'userProfileSection';
    document.body.appendChild(userProfileSection);

    checkUserSignInStatus();

    signInButton.addEventListener('click', initiateGoogleAuth);

    // Additional button handlers for word detection, red dot projection, etc.
    document.getElementById("detect-word").addEventListener("click", detectWord);
    document.getElementById("project-dot").addEventListener("click", projectRedDot);
    document.getElementById("start-optimize").addEventListener("click", startEyeOptimize);
    document.getElementById("reset-page").addEventListener("click", resetPage);

    function checkUserSignInStatus() {
        chrome.storage.local.get(['userInfo'], function (result) {
            if (result.userInfo) {
                showUserProfile(result.userInfo);
            } else {
                showSignInButton();
            }
        });
    }

    function initiateGoogleAuth() {
        chrome.runtime.sendMessage({ action: 'startGoogleAuth' }, function (response) {
            if (response.error) {
                console.error('Sign-in failed:', response.error);
                signInStatus.textContent = 'Sign-in failed: ' + response.error;
            } else {
                showUserProfile(response.userInfo);
            }
        });
    }

    function showUserProfile(userInfo) {
        signInButton.style.display = 'none';
        userProfileSection.innerHTML = '';

        const profileContainer = document.createElement('div');
        profileContainer.style.display = 'flex';
        profileContainer.style.alignItems = 'center';
        profileContainer.style.marginTop = '10px';

        const profilePic = document.createElement('img');
        profilePic.src = userInfo.picture;
        profilePic.style.width = '50px';
        profilePic.style.height = '50px';
        profilePic.style.borderRadius = '50%';
        profileContainer.appendChild(profilePic);

        const userInfoContainer = document.createElement('div');
        userInfoContainer.style.marginLeft = '10px';

        const userName = document.createElement('div');
        userName.textContent = userInfo.name;
        userName.style.fontWeight = 'bold';
        userInfoContainer.appendChild(userName);

        const userEmail = document.createElement('div');
        userEmail.textContent = userInfo.email;
        userEmail.style.fontSize = '12px';
        userEmail.style.color = 'gray';
        userInfoContainer.appendChild(userEmail);

        profileContainer.appendChild(userInfoContainer);
        userProfileSection.appendChild(profileContainer);

        const signOutButton = document.createElement('button');
        signOutButton.textContent = 'Sign Out';
        signOutButton.style.marginTop = '10px';
        signOutButton.addEventListener('click', signOut);
        userProfileSection.appendChild(signOutButton);
    }

    function showSignInButton() {
        signInButton.style.display = 'block';
        signInStatus.textContent = '';
        userProfileSection.innerHTML = '';
    }

    function signOut() {
        chrome.storage.local.get(['token'], function (result) {
            const token = result.token;
            if (token) {
                revokeToken(token);
                chrome.identity.removeCachedAuthToken({ token: token }, function () {
                    console.log('User signed out');
                    chrome.storage.local.remove(['userInfo', 'token'], function() {
                        showSignInButton();
                    });
                });
            }
        });
    }

    function revokeToken(token) {
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`, {
            method: 'POST',
            headers: {
                'Content-type': 'application/x-www-form-urlencoded'
            }
        }).then(response => {
            console.log('Token revoked:', response);
        }).catch(error => {
            console.error('Error revoking token:', error);
        });
    }

    function detectWord() {
        console.log("Detect Word button clicked");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'detectWord' }, (response) => {
                if (response && response.word) {
                    console.log(`Detected word: ${response.word}`);
                    document.getElementById('detected-word').innerText = response.word || 'blank';
                } else {
                    console.error("No word detected.");
                    document.getElementById('detected-word').innerText = 'No word detected';
                }
            });
        });
    }

    function projectRedDot() {
        console.log("Project Red Dot button clicked");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'projectRedDot' }, (response) => {
                console.log(response.status);
            });
        });
    }

    function startEyeOptimize() {
        console.log("Start Eye-Optimized View button clicked");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'startEyeOptimize' }, (response) => {
                if (response && response.status) {
                    console.log(response.status);
                }
            });
        });
    }

    function resetPage() {
        console.log("Reset Page button clicked");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'resetPage' }, (response) => {
                if (response && response.status) {
                    console.log(response.status);
                }
            });
        });
    }
});