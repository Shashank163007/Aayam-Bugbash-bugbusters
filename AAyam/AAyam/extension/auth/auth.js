const API_BASE_URL = 'http://localhost:3000/api';
let isLoginMode = true;

const form = document.getElementById('auth-form');
const btnSubmit = document.getElementById('btn-submit');
const toggleLink = document.getElementById('toggle-link');
const btnGoogle = document.getElementById('btn-google');
const errorMsg = document.getElementById('error-message');

toggleLink.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  btnSubmit.textContent = isLoginMode ? 'Login' : 'Sign up';
  document.getElementById('toggle-text').textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
  toggleLink.textContent = isLoginMode ? 'Sign up' : 'Login';
  errorMsg.textContent = '';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  btnSubmit.disabled = true;
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
      chrome.runtime.sendMessage({ action: 'setAuthToken', token: data.token }, () => {
        window.parent.postMessage('pf-auth-success', '*');
      });
    } else {
      errorMsg.textContent = data.error || 'Authentication failed';
    }
  } catch (err) {
    errorMsg.textContent = 'Network error. Make sure backend is running.';
  } finally {
    btnSubmit.disabled = false;
  }
});

btnGoogle.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'googleLogin' }, (response) => {
    if (response?.success) window.parent.postMessage('pf-auth-success', '*');
    else errorMsg.textContent = response?.error || 'Google Login failed';
  });
});