// Store both original and custom titles using tab IDs
const tabTitles = {};


// Function to wait for title to stabilize
const waitForTitleStabilization = (tabId, maxAttempts = 5) => {
  let attempts = 0;
  let lastTitle = null;

  const checkTitle = () => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.log(`[Tab Renamer] Error getting tab info: ${chrome.runtime.lastError.message}`);
        return;
      }

      if (lastTitle === tab.title) {
        // Title has stabilized
        console.log(`[Tab Renamer] Title stabilized at: ${tab.title}`);
        
        // Store the stabilized title as original title
        if (tabTitles[tabId]) {
          tabTitles[tabId].originalTitle = tab.title;
          console.log(`[Tab Renamer] Stored original title: ${tab.title}`);
          
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
        console.log(`[Tab Renamer] Using last seen title: ${tab.title}`);
        if (tabTitles[tabId]) {
          tabTitles[tabId].originalTitle = tab.title;
          console.log(`[Tab Renamer] Stored original title: ${tab.title}`);
          
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
  console.log(`[Tab Renamer] Setting title to: ${title}`);
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    function: (newTitle) => { 
      try {
        console.log(`[Tab Renamer] Setting title to: ${newTitle}`);
        document.title = newTitle;
        return true;
      } catch (error) {
        console.error(`[Tab Renamer] Error setting title: ${error.message}`);
        return false;
      }
    },
    args: [title]
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.log(`[Tab Renamer] Error executing script: ${chrome.runtime.lastError.message}`);
    } else if (results && results[0] && results[0].result) {
      console.log(`[Tab Renamer] Title set successfully`);
    }
  });
};

// Function to reset tab title
const resetTabTitle = (tabId) => {
  console.log(`[Tab Renamer] Starting reset for tab ${tabId}`);
  
  if (tabTitles[tabId]?.originalTitle) {
    const originalTitle = tabTitles[tabId].originalTitle;
    console.log(`[Tab Renamer] Resetting to original title: ${originalTitle}`);
    setTabTitle(tabId, originalTitle);
    
    // Remove custom title
    tabTitles[tabId].customTitle = null;
    console.log(`[Tab Renamer] Removed custom title`);
  } else {
    console.log(`[Tab Renamer] No original title found for tab ${tabId}`);
  }
};

// Listen for tab updates to handle navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log(`[Tab Renamer] Tab ${tabId} updated, new title: ${tab.title}`);
    
    // Initialize tab entry if it doesn't exist
    if (!tabTitles[tabId]) {
      tabTitles[tabId] = {
        originalTitle: null,
        customTitle: null
      };
      console.log(`[Tab Renamer] Created new title entry for tab ${tabId}`);
    }
    
    // Wait for title to stabilize before applying custom title
    waitForTitleStabilization(tabId);
  }
});

// Listen for tab removal to clean up
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log(`[Tab Renamer] Tab ${tabId} removed, cleaning up`);
  delete tabTitles[tabId];
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`[Tab Renamer] Received message:`, message);
  if (message.action === "renameTab") {
    console.log(`[Tab Renamer] Processing rename action for tab ${message.tabId}`);
    
    // Store the current title as original title before applying custom title
    if (!tabTitles[message.tabId]) {
      tabTitles[message.tabId] = {
        originalTitle: message.originalTitle,
        customTitle: message.title
      };
      console.log(`[Tab Renamer] Created new title entry for tab ${message.tabId}`);
    } else {
      tabTitles[message.tabId].customTitle = message.title;
      console.log(`[Tab Renamer] Updated custom title for tab ${message.tabId}`);
    }

    setTabTitle(message.tabId, message.title);
  } else if (message.action === "resetTab") {
    console.log(`[Tab Renamer] Processing reset action for tab ${message.tabId}`);
    resetTabTitle(message.tabId);
  }
});
