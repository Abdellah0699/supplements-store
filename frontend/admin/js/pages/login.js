/**
 * login.js — admin sign-in page (Phase 4: real backend authentication).
 * Credentials go to POST /api/admin/auth/login; the session lives in
 * an HttpOnly cookie set by the server. Nothing sensitive is stored
 * in JavaScript.
 */
(async function () {
  'use strict';

  // Already signed in? Go straight to the dashboard.
  if (await window.AdminAPI.getSessionAsync()) {
    window.location.replace('dashboard.html');
    return;
  }

  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

  function showError(message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }

  // Bounced here because the previous session expired?
  if (window.AdminAPI.wasSessionExpired()) {
    showError('Your session expired. Please sign in again.');
  }

  [usernameInput, passwordInput].forEach((input) =>
    input.addEventListener('input', () => {
      clearError();
      window.Components.clearFieldError(input);
    })
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    window.Components.clearAllFieldErrors(form);

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    let valid = true;
    if (!username) {
      window.Components.setFieldError(usernameInput, 'Enter your username.');
      valid = false;
    }
    if (!password) {
      window.Components.setFieldError(passwordInput, 'Enter your password.');
      valid = false;
    }
    if (!valid) {
      (username ? passwordInput : usernameInput).focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      await window.AdminAPI.login(username, password);
      window.location.replace('dashboard.html');
    } catch (err) {
      // 401 from the server means bad credentials - the message is
      // deliberately generic (the backend never says which part was wrong).
      showError(err.status === 401 ? 'Invalid username or password.' : err.message || 'Sign-in failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
      passwordInput.value = '';
      passwordInput.focus();
    }
  });

  usernameInput.focus();
})();
