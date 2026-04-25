document.getElementById('btn-allow').addEventListener('click', () => {
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: 'giveConsent' }, (response) => {
      if (response && response.success) {
        window.parent.postMessage('pf-consent-given', '*');
      }
    });
  } else {
    // Fallback if not running in extension context properly
    window.parent.postMessage('pf-consent-given', '*');
  }
});

document.getElementById('btn-deny').addEventListener('click', () => {
  window.parent.postMessage('pf-consent-denied', '*');
});