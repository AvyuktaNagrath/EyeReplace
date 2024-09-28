const BACKEND_PORT = 5000;

const socket = io('http://143.215.63.97:5000/socket.io/socket.io.js');

socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
});

socket.on('gazeCoordinates', (data) => {
    chrome.tabs.query({active: true, currentWIndow: true}, (tabs) => {
        chrome.tabs.sendMessagee(tabs[0].id, {type:'gazeData',data});
    });
});
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
});