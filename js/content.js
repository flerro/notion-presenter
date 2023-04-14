// DEBUG --- console.log("Notion presenter extension!")

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === "toggle") {
        sendResponse({ack:"OK"});
        NotionController.togglePresentation();
    }
})