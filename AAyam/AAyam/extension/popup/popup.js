document.addEventListener('DOMContentLoaded', () => {
  const toggleScan = document.getElementById('toggle-scan');
  const statusText = document.getElementById('status-text');
  const btnDashboard = document.getElementById('btn-dashboard');
  const btnLogout = document.getElementById('btn-logout');

  chrome.storage.local.get(['autoScan', 'token'], (result) => {
    toggleScan.checked = result.autoScan !== false;
    updateStatusText(toggleScan.checked);
    if (result.token) btnLogout.style.display = 'block';
  });

  toggleScan.addEventListener('change', (e) => {
    chrome.storage.local.set({ autoScan: e.target.checked });
    updateStatusText(e.target.checked);
  });

  function updateStatusText(isActive) {
    statusText.textContent = isActive ? 'Scanner is Active' : 'Scanner is Paused';
    statusText.style.color = isActive ? '#00cc44' : '#8b949e';
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