const API_BASE_URL = 'http://localhost:3000/api';
let isLoginMode = true;

const form = document.getElementById('auth-form');
const btnSubmit = document.getElementById('btn-submit');
const toggleLink = document.getElementById('toggle-link');
const toggleText = document.getElementById('toggle-text');
const btnGoogle = document.getElementById('btn-google');
const errorMsg = document.getElementById('error-message');

toggleLink.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  if (isLoginMode) {
    btnSubmit.textContent = 'Login';
    toggleText.textContent = "Don't have an account?";
    toggleLink.textContent = 'Sign up';
  } else {
    btnSubmit.textContent = 'Sign up';
    toggleText.textContent = "Already have an account?";
    toggleLink.textContent = 'Login';
  }
  errorMsg.textContent = '';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  btnSubmit.disabled = true;
  btnSubmit.style.opacity = '0.7';
  errorMsg.textContent = '';
  
  const endpoint = isLoginMode ? '/auth/login' : '/auth/signup';
  
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    
    if (res.ok && data.token) {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'setAuthToken', token: data.token }, () => {
          window.parent.postMessage('pf-auth-success', '*');
        });
      } else {
        window.parent.postMessage('pf-auth-success', '*');
      }
    } else {
      errorMsg.textContent = data.error || 'Authentication failed';
    }
  } catch (err) {
    errorMsg.textContent = 'Network error. Make sure backend is running.';
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.style.opacity = '1';
  }
});

btnGoogle.addEventListener('click', () => {
  errorMsg.textContent = '';
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: 'googleLogin' }, (response) => {
      if (response && response.success) {
        window.parent.postMessage('pf-auth-success', '*');
      } else {
        errorMsg.textContent = response ? response.error : 'Google Login failed';
      }
    });
  }
});