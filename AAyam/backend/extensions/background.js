const API_BASE_URL = 'http://localhost:3000/api'; // Change to Vercel URL in production

// Initialize extension state on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    autoScan: true,
    consentGiven: false,
    token: null
  });
});

// Handle messages from content script or popups
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeEmail') {
    handleEmailAnalysis(request.data, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getAuthToken') {
    chrome.storage.local.get(['token'], (result) => {
      sendResponse({ token: result.token });
    });
    return true;
  }
  
  if (request.action === 'setAuthToken') {
    chrome.storage.local.set({ token: request.token }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'logout') {
    chrome.storage.local.remove(['token'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'checkConsent') {
    chrome.storage.local.get(['consentGiven', 'token'], (result) => {
      sendResponse({ consentGiven: result.consentGiven, hasToken: !!result.token });
    });
    return true;
  }

  if (request.action === 'giveConsent') {
    chrome.storage.local.set({ consentGiven: true }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'googleLogin') {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError || !token) {
        sendResponse({ success: false, error: chrome.runtime.lastError });
        return;
      }
      
      // Exchange Google token for our JWT via backend
      fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          chrome.storage.local.set({ token: data.token }, () => {
            sendResponse({ success: true, token: data.token });
          });
        } else {
          sendResponse({ success: false, error: data.error });
        }
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    });
    return true;
  }
});

async function handleEmailAnalysis(emailData, sendResponse) {
  try {
    const { autoScan, token, consentGiven } = await chrome.storage.local.get(['autoScan', 'token', 'consentGiven']);
    
    if (!consentGiven || !token) {
      sendResponse({ status: 'unauthorized', error: 'Authentication or consent required' });
      return;
    }

    if (!autoScan) {
      sendResponse({ status: 'skipped', message: 'Auto-scan is disabled' });
      return;
    }

    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const report = await response.json();
    sendResponse({ status: 'success', report });

  } catch (error) {
    console.error("Analysis failed:", error);
    sendResponse({ status: 'error', error: error.message });
  }
}