const API_BASE_URL = 'http://localhost:3000/api';
let scansData = [];
let authToken = null;

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['token'], (result) => {
    if (!result.token) {
      window.location.href = '../auth/auth.html';
      return;
    }
    authToken = result.token;
    fetchHistory();
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'logout' }, () => {
      window.location.href = '../auth/auth.html';
    });
  });

  document.getElementById('btn-clear').addEventListener('click', clearHistory);

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderTable(e.target.dataset.filter);
    });
  });

  document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('report-modal').style.display = 'none';
  });
});

async function fetchHistory() {
  try {
    const response = await fetch(`${API_BASE_URL}/history/list`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) throw new Error('Failed to fetch');
    scansData = await response.json();
    updateStats();
    renderTable('all');
  } catch (error) {
    console.error("Error fetching history:", error);
  }
}

async function clearHistory() {
  if (!confirm("Are you sure you want to clear all scan history?")) return;
  try {
    const response = await fetch(`${API_BASE_URL}/history/clear`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (response.ok) {
      scansData = [];
      updateStats();
      renderTable('all');
    }
  } catch (error) {
    console.error("Error clearing history:", error);
  }
}

function updateStats() {
  document.getElementById('stat-total').textContent = scansData.length;
  document.getElementById('stat-high').textContent = scansData.filter(s => s.riskLevel === 'HIGH').length;
  document.getElementById('stat-medium').textContent = scansData.filter(s => s.riskLevel === 'MEDIUM').length;
  document.getElementById('stat-low').textContent = scansData.filter(s => s.riskLevel === 'LOW').length;
}

function renderTable(filter) {
  const tbody = document.getElementById('scans-tbody');
  const emptyState = document.getElementById('empty-state');
  tbody.innerHTML = '';

  const filteredData = filter === 'all' 
    ? scansData 
    : scansData.filter(s => s.riskLevel.toLowerCase() === filter);

  if (filteredData.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  filteredData.forEach(scan => {
    const tr = document.createElement('tr');
    
    const date = new Date(scan.timestamp).toLocaleString();
    const badgeClass = scan.riskLevel === 'HIGH' ? 'badge-high' : scan.riskLevel === 'MEDIUM' ? 'badge-medium' : 'badge-low';
    const findingsCount = scan.findings ? scan.findings.length : 0;
    
    tr.innerHTML = `
      <td style="color:#8b949e;font-size:13px;">${date}</td>
      <td>
        <div style="font-weight:bold;">${escapeHtml(scan.senderName)}</div>
        <div style="color:#8b949e;font-size:12px;">${escapeHtml(scan.sender)}</div>
      </td>
      <td>${escapeHtml(scan.subject).substring(0, 50)}${scan.subject.length > 50 ? '...' : ''}</td>
      <td><span class="badge ${badgeClass}">${scan.riskLevel}</span></td>
      <td>${findingsCount}</td>
      <td><button class="btn btn-secondary view-report-btn" data-id="${scan._id}">View Report</button></td>
    `;
    
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.view-report-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scanId = e.target.dataset.id;
      const scan = scansData.find(s => s._id === scanId);
      if (scan) openReportModal(scan);
    });
  });
}

function openReportModal(scan) {
  const modalBody = document.getElementById('modal-body');
  const report = scan.fullReport;
  
  const scoreClass = report.risk_score >= 75 ? 'pf-score-high' : report.risk_score >= 40 ? 'pf-score-medium' : 'pf-score-low';
  const badgeClass = report.risk_score >= 75 ? 'badge-high' : report.risk_score >= 40 ? 'badge-medium' : 'badge-low';
  
  let findingsHtml = '';
  if (report.findings && report.findings.length > 0) {
    findingsHtml = report.findings.map(f => {
      const icon = f.severity === 'RED' ? '🔴' : f.severity === 'YELLOW' ? '🟡' : '🟢';
      return `
        <div class="pf-finding-card">
          <div class="pf-finding-header">${icon} ${f.type}</div>
          <div class="pf-finding-detail">${f.explanation}</div>
          ${f.malicious_phrase ? `<div class="pf-malicious-text">${escapeHtml(f.malicious_phrase)}</div>` : ''}
        </div>
      `;
    }).join('');
  } else {
    findingsHtml = `<div style="text-align: center; color: #8b949e; padding: 20px;">No threats detected</div>`;
  }

  modalBody.innerHTML = `
    <div class="pf-header">
      <div class="pf-score-ring ${scoreClass}">${report.risk_score}</div>
      <div>
        <div style="margin-bottom: 4px; font-weight: bold; font-size:18px;">${escapeHtml(scan.subject)}</div>
        <span class="badge ${badgeClass}">${report.overall_risk} RISK</span>
      </div>
    </div>
    <div class="pf-verdict">${escapeHtml(report.verdict)}</div>
    <div class="pf-findings">
      ${findingsHtml}
    </div>
  `;

  document.getElementById('report-modal').style.display = 'block';
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}