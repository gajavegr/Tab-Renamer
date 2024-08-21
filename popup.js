document.getElementById('renameBtn').addEventListener('click', () => {
    const newTitle = document.getElementById('newTitle').value;
    if (newTitle) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        chrome.runtime.sendMessage({
          action: "renameTab",
          tabId: activeTab.id,
          title: newTitle,
          originalTitle: activeTab.title
        });
      });
    }
  });
  
  document.getElementById('resetBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      chrome.runtime.sendMessage({
        action: "resetTab",
        tabId: activeTab.id
      });
    });
  });
  