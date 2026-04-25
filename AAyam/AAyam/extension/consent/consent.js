document.getElementById('btn-allow').addEventListener('click', () => {
  if (chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ action: 'giveConsent' }, (response) => {
      if (response?.success) window.parent.postMessage('pf-consent-given', '*');
    });
  } else {
    window.parent.postMessage('pf-consent-given', '*');
  }
});

document.getElementById('btn-deny').addEventListener('click', () => {
  window.parent.postMessage('pf-consent-denied', '*');
});