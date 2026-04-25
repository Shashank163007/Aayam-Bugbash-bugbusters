document.addEventListener('DOMContentLoaded', () => {
  const toggleScan = document.getElementById('toggle-scan');
  const statusText = document.getElementById('status-text');
  const btnDashboard = document.getElementById('btn-dashboard');
  const btnLogout = document.getElementById('btn-logout');

  // Load state
  chrome.storage.local.get(['autoScan', 'token'], (result) => {
    toggleScan.checked = result.autoScan !== false; // Default true
    updateStatusText(toggleScan.checked);
    
    if (result.token) {
      btnLogout.style.display = 'block';
    }
  });

  toggleScan.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    chrome.storage.local.set({ autoScan: isChecked });
    updateStatusText(isChecked);
  });

  function updateStatusText(isActive) {
    if (isActive) {
      statusText.textContent = 'Scanner is Active';
      statusText.style.color = '#00cc44';
    } else {
      statusText.textContent = 'Scanner is Paused';
      statusText.style.color = '#8b949e';
    }
  }

  btnDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  });

  btnLogout.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'logout' }, () => {
      btnLogout.style.display = 'none';
      statusText.textContent = 'Logged Out';
      statusText.style.color = '#ff4444';
      toggleScan.checked = false;
      toggleScan.disabled = true;
    });
  });
});