

chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL('index.html');
  chrome.tabs.query({}, (tabs) => {
    const existingTab = tabs.find(tab => tab.url && tab.url.startsWith(url));
    if (existingTab) {
      chrome.tabs.update(existingTab.id, { active: true });
      chrome.windows.update(existingTab.windowId, { focused: true });
    } else {
      chrome.tabs.create({ url });
    }
  });
});

// Listen for zoom messages from content scripts/pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!sender.tab) return;
  const tabId = sender.tab.id;
  if (message.type === 'zoom-in') {
    chrome.tabs.getZoom(tabId, (currentZoom) => {
      chrome.tabs.setZoom(tabId, Math.min(currentZoom + 0.1, 3));
      sendResponse({success: true});
    });
    return true;
  } else if (message.type === 'zoom-out') {
    chrome.tabs.getZoom(tabId, (currentZoom) => {
      chrome.tabs.setZoom(tabId, Math.max(currentZoom - 0.1, 0.25));
      sendResponse({success: true});
    });
    return true;
  } else if (message.type === 'zoom-reset') {
    chrome.tabs.setZoom(tabId, 1, () => {
      sendResponse({success: true});
    });
    return true;
  }
});