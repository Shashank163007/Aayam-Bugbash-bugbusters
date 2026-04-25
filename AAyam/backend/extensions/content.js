// content.js runs in Gmail

let currentEmailId = null;
let observer = null;

// Inject CSS for our components
const style = document.createElement('style');
style.textContent = `
  /* Toast */
  .pf-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #161b22;
    color: #f0f6fc;
    padding: 12px 20px;
    border-radius: 8px;
    border: 1px solid #00cc44;
    font-family: 'Inter', system-ui, sans-serif;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
  }
  .pf-toast.pf-show {
    opacity: 1;
    transform: translateY(0);
  }
  
  /* Report Popup */
  .pf-report-overlay {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 420px;
    background: #0d1117;
    border-radius: 12px;
    border: 1px solid #30363d;
    box-shadow: 0 8px 24px rgba(0,0,0,0.8);
    z-index: 999998;
    font-family: 'Inter', system-ui, sans-serif;
    color: #f0f6fc;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    opacity: 0;
    transform: translateX(20px);
    transition: all 0.3s ease;
  }
  .pf-report-overlay.pf-show {
    opacity: 1;
    transform: translateX(0);
  }
  .pf-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #161b22;
    border-bottom: 1px solid #30363d;
  }
  .pf-score-ring {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 20px;
    border: 4px solid #30363d;
  }
  .pf-score-high { border-color: #ff4444; color: #ff4444; }
  .pf-score-medium { border-color: #ff8c00; color: #ff8c00; }
  .pf-score-low { border-color: #00cc44; color: #00cc44; }
  
  .pf-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
  }
  .pf-badge-high { background: #2d1111; color: #ff4444; border: 1px solid #ff4444; }
  .pf-badge-medium { background: #2d1e00; color: #ff8c00; border: 1px solid #ff8c00; }
  .pf-badge-low { background: #0d2d1a; color: #00cc44; border: 1px solid #00cc44; }
  
  .pf-verdict {
    padding: 16px;
    font-size: 14px;
    border-bottom: 1px solid #30363d;
  }
  
  .pf-findings {
    padding: 16px;
    max-height: 300px;
    overflow-y: auto;
  }
  
  .pf-finding-card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }
  .pf-finding-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-weight: bold;
    font-size: 14px;
  }
  .pf-finding-detail {
    font-size: 13px;
    color: #8b949e;
    margin-bottom: 8px;
  }
  .pf-malicious-text {
    background: #2d1111;
    color: #ff4444;
    padding: 4px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    word-break: break-all;
  }
  
  .pf-footer {
    padding: 12px 16px;
    background: #161b22;
    border-top: 1px solid #30363d;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }
  
  .pf-close {
    cursor: pointer;
    background: none;
    border: none;
    color: #8b949e;
    font-size: 20px;
  }
  .pf-close:hover { color: #f0f6fc; }

  /* Body highlighting */
  .pf-highlight-red {
    background-color: rgba(255, 68, 68, 0.2);
    border-bottom: 2px solid #ff4444;
    font-weight: bold;
  }
  .pf-highlight-yellow {
    background-color: rgba(255, 140, 0, 0.2);
    border-bottom: 2px solid #ff8c00;
  }
`;
document.head.appendChild(style);

function showToast(message) {
  const existing = document.getElementById('pf-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'pf-toast';
  toast.className = 'pf-toast';
  toast.innerHTML = `🛡️ ${message}`;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('pf-show'), 100);
  
  setTimeout(() => {
    toast.classList.remove('pf-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function renderReport(report, emailBodyEl) {
  const existing = document.getElementById('pf-report');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pf-report';
  overlay.className = 'pf-report-overlay';

  const scoreClass = report.risk_score >= 75 ? 'pf-score-high' : report.risk_score >= 40 ? 'pf-score-medium' : 'pf-score-low';
  const badgeClass = report.risk_score >= 75 ? 'pf-badge-high' : report.risk_score >= 40 ? 'pf-badge-medium' : 'pf-badge-low';
  const riskLabel = report.overall_risk;

  let findingsHtml = '';
  if (report.findings && report.findings.length > 0) {
    findingsHtml = report.findings.map(f => {
      const icon = f.severity === 'RED' ? '🔴' : f.severity === 'YELLOW' ? '🟡' : '🟢';
      
      // Highlight in body if possible
      if (f.malicious_phrase && emailBodyEl) {
        highlightInNode(emailBodyEl, f.malicious_phrase, f.severity === 'RED' ? 'pf-highlight-red' : 'pf-highlight-yellow');
      }
      
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

  overlay.innerHTML = `
    <div class="pf-header">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div class="pf-score-ring ${scoreClass}">${report.risk_score}</div>
        <div>
          <div style="margin-bottom: 4px; font-weight: bold;">Phishing Forensics</div>
          <span class="pf-badge ${badgeClass}">${riskLabel} RISK</span>
        </div>
      </div>
      <button class="pf-close" id="pf-close-btn">&times;</button>
    </div>
    <div class="pf-verdict">${escapeHtml(report.verdict)}</div>
    <div class="pf-findings">
      ${findingsHtml}
    </div>
    <div class="pf-footer">
      <span>Auto-scan: ON</span>
      <a href="#" id="pf-open-dashboard" style="color: #58a6ff; text-decoration: none;">View History</a>
    </div>
  `;

  document.body.appendChild(overlay);
  
  document.getElementById('pf-close-btn').addEventListener('click', () => {
    overlay.classList.remove('pf-show');
    setTimeout(() => overlay.remove(), 300);
  });
  
  document.getElementById('pf-open-dashboard').addEventListener('click', (e) => {
    e.preventDefault();
    window.open(chrome.runtime.getURL('dashboard/dashboard.html'), '_blank');
  });

  setTimeout(() => overlay.classList.add('pf-show'), 100);
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

function highlightInNode(node, text, className) {
  if (!text || text.length < 3) return;
  
  // A simple highlighting function that searches text nodes
  const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
  let n;
  const nodesToReplace = [];
  while(n = walk.nextNode()) {
    if (n.nodeValue.includes(text)) {
      nodesToReplace.push(n);
    }
  }
  
  nodesToReplace.forEach(textNode => {
    const regex = new RegExp(`(${text.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
    const parts = textNode.nodeValue.split(regex);
    const span = document.createElement('span');
    parts.forEach(part => {
      if (part.toLowerCase() === text.toLowerCase()) {
        const h = document.createElement('span');
        h.className = className;
        h.textContent = part;
        span.appendChild(h);
      } else {
        span.appendChild(document.createTextNode(part));
      }
    });
    textNode.parentNode.replaceChild(span, textNode);
  });
}

function checkAndShowConsent() {
  chrome.runtime.sendMessage({ action: 'checkConsent' }, (response) => {
    if (!response.consentGiven) {
      // Inject iframe for consent
      if (!document.getElementById('pf-consent-iframe')) {
        const iframe = document.createElement('iframe');
        iframe.id = 'pf-consent-iframe';
        iframe.src = chrome.runtime.getURL('consent/consent.html');
        iframe.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; border: none; z-index: 9999999; background: rgba(0,0,0,0.8);';
        document.body.appendChild(iframe);
        
        // Listen for message from iframe
        window.addEventListener('message', function consentListener(e) {
          if (e.data === 'pf-consent-given') {
            iframe.remove();
            window.removeEventListener('message', consentListener);
            checkAndShowAuth();
          } else if (e.data === 'pf-consent-denied') {
            iframe.remove();
            window.removeEventListener('message', consentListener);
          }
        });
      }
    } else {
      checkAndShowAuth();
    }
  });
}

function checkAndShowAuth() {
  chrome.runtime.sendMessage({ action: 'checkConsent' }, (response) => {
    if (response.consentGiven && !response.hasToken) {
      if (!document.getElementById('pf-auth-iframe')) {
        const iframe = document.createElement('iframe');
        iframe.id = 'pf-auth-iframe';
        iframe.src = chrome.runtime.getURL('auth/auth.html');
        iframe.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; border: none; z-index: 9999999; background: rgba(0,0,0,0.8);';
        document.body.appendChild(iframe);
        
        window.addEventListener('message', function authListener(e) {
          if (e.data === 'pf-auth-success') {
            iframe.remove();
            window.removeEventListener('message', authListener);
            showToast("Phishing Forensics AI is now active and protecting your inbox");
            initObserver(); // Start observing after auth
          } else if (e.data === 'pf-auth-closed') {
            iframe.remove();
            window.removeEventListener('message', authListener);
          }
        });
      }
    } else if (response.consentGiven && response.hasToken) {
      initObserver(); // Start observing if already authed
    }
  });
}

function extractEmailData() {
  // Gmail DOM selectors (may change over time, need robustness)
  const subjectEl = document.querySelector('h2.hP');
  const senderEl = document.querySelector('span.gD');
  const bodyEl = document.querySelector('div.a3s');

  if (!subjectEl || !senderEl || !bodyEl) return null;

  return {
    subject: subjectEl.innerText,
    senderName: senderEl.innerText,
    sender: senderEl.getAttribute('email'),
    body: bodyEl.innerText,
    bodyElement: bodyEl // used for highlighting
  };
}

function handleEmailOpen() {
  const data = extractEmailData();
  if (!data) return;

  // Simple ID generation to prevent re-scanning the same email
  const emailId = data.subject + data.sender;
  if (currentEmailId === emailId) return;
  currentEmailId = emailId;

  // Show loading indicator in console or UI if desired
  console.log("[Phishing Forensics] Scanning email:", data.subject);

  chrome.runtime.sendMessage({ 
    action: 'analyzeEmail', 
    data: {
      subject: data.subject,
      senderName: data.senderName,
      sender: data.sender,
      body: data.body
    }
  }, (response) => {
    if (response && response.status === 'success') {
      renderReport(response.report, data.bodyElement);
    } else if (response && response.status === 'skipped') {
      console.log("[Phishing Forensics] Auto-scan disabled.");
    } else {
      console.error("[Phishing Forensics] Scan failed:", response?.error);
    }
  });
}

function initObserver() {
  if (observer) return;
  
  // Watch for changes in the main content area to detect email opens
  const mainContent = document.querySelector('div[role="main"]') || document.body;
  
  observer = new MutationObserver((mutations) => {
    // Check if an email body is visible
    const bodyEl = document.querySelector('div.a3s');
    if (bodyEl && bodyEl.offsetParent !== null) {
      // Debounce or check if it's a new email
      setTimeout(handleEmailOpen, 500); // Wait a bit for DOM to settle
    }
  });

  observer.observe(mainContent, { childList: true, subtree: true });
  
  // Also check immediately in case an email is already open
  setTimeout(handleEmailOpen, 1000);
}

// Initial check on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndShowConsent);
} else {
  checkAndShowConsent();
}