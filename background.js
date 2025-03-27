// Store both original and custom titles using tab IDs
const tabTitles = {};


// Function to wait for title to stabilize
const waitForTitleStabilization = (tabId, maxAttempts = 5) => {
  let attempts = 0;
  let lastTitle = null;

  const checkTitle = () => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        return;
      }

      if (lastTitle === tab.title) {
        // Title has stabilized
        
        // Store the stabilized title as original title
        if (tabTitles[tabId]) {
          tabTitles[tabId].originalTitle = tab.title;
          
          // If we have a custom title, apply it now
          if (tabTitles[tabId].customTitle) {
            setTabTitle(tabId, tabTitles[tabId].customTitle);
          }
        }
        return;
      }

      lastTitle = tab.title;
      attempts++;

      if (attempts < maxAttempts) {
        // Check again in 1 second
        setTimeout(checkTitle, 1000);
      } else {
        // Use the last title we saw
        if (tabTitles[tabId]) {
          tabTitles[tabId].originalTitle = tab.title;
          
          // If we have a custom title, apply it now
          if (tabTitles[tabId].customTitle) {
            setTabTitle(tabId, tabTitles[tabId].customTitle);
          }
        }
      }
    });
  };

  checkTitle();
};

// Function to set tab title
const setTabTitle = (tabId, title) => {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    function: (newTitle) => { 
      try {
        document.title = newTitle;
        return true;
      } catch (error) {
        console.error(`[Tab Renamer] Error setting title: ${error.message}`);
        return false;
      }
    },
    args: [title]
  });
};

// Function to reset tab title
const resetTabTitle = (tabId) => {
  
  if (tabTitles[tabId]?.originalTitle) {
    const originalTitle = tabTitles[tabId].originalTitle;
    setTabTitle(tabId, originalTitle);
    
    // Remove custom title
    tabTitles[tabId].customTitle = null;
  }
};

// Listen for tab updates to handle navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    
    // Initialize tab entry if it doesn't exist
    if (!tabTitles[tabId]) {
      tabTitles[tabId] = {
        originalTitle: null,
        customTitle: null
      };
    }
    
    // Wait for title to stabilize before applying custom title
    waitForTitleStabilization(tabId);
  }
});

// Listen for tab removal to clean up
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabTitles[tabId];
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "renameTab") {
    
    // Store the current title as original title before applying custom title
    if (!tabTitles[message.tabId]) {
      tabTitles[message.tabId] = {
        originalTitle: message.originalTitle,
        customTitle: message.title
      };
    } else {
      tabTitles[message.tabId].customTitle = message.title;
    }

    setTabTitle(message.tabId, message.title);
  } else if (message.action === "resetTab") {
    resetTabTitle(message.tabId);
  }
});
