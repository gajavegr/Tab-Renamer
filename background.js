const originalTitles = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "renameTab") {
    if (!originalTitles[message.tabId]) {
      originalTitles[message.tabId] = message.originalTitle;
    }
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      function: (title) => { document.title = title; },
      args: [message.title]
    });
  } else if (message.action === "resetTab") {
    const originalTitle = originalTitles[message.tabId];
    if (originalTitle) {
      chrome.scripting.executeScript({
        target: { tabId: message.tabId },
        function: (title) => { document.title = title; },
        args: [originalTitle]
      });
    }
  }
});
