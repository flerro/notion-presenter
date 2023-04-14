chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeText({text: ''});
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.ack) {
        console.log(msg.ack);
    }
});

chrome.action.onClicked.addListener(async (tab) => {
    const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
    const nextState = prevState === 'ON' ? 'OFF' : 'ON';

    await chrome.action.setBadgeText({
        tabId: tab.id,
        text: nextState === 'ON' ? nextState : ''
    });

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action:"toggle"});
    });
});
