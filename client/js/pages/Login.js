import { API } from '../api.js';
import { SocketClient } from '../socket.js';
import { APP } from '../app.js';

export const LoginPage = {
  render: () => {
    const authOverlay = document.getElementById('auth-overlay');
    authOverlay.innerHTML = `
      <div class="card" style="width: 100%; max-width: 400px; padding: 2.5rem; margin: 1rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <i class="fa-solid fa-coins" style="font-size: 3rem; color: var(--color-primary); margin-bottom: 1rem;"></i>
          <h2>GTAP Login</h2>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">Gold Trading Automation Platform</p>
        </div>
        <form id="login-form">
          <div class="form-group">
            <label for="login-email">Email Address</label>
            <input type="email" id="login-email" required placeholder="name@example.com">
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" required placeholder="••••••••">
          </div>
          <button type="submit" id="login-submit-btn" class="btn btn-primary" style="width: 100%; margin-top: 1.5rem; gap: 0.5rem;">
            <span>Sign In</span>
          </button>
        </form>
      </div>
    `;

    // Bind event submission handler
    const form = document.getElementById('login-form');
    form.addEventListener('submit', LoginPage.handleLogin);
  },

  handleLogin: async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('login-submit-btn');

    try {
      // Toggle button loading spinner state
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Authenticating...</span>';
      submitBtn.disabled = true;

      const response = await API.login(email, password);
      
      if (response && response.success) {
        window.Store.user = response.data;
        document.getElementById('username-display').innerText = response.data.fullName;

        // Display dashboard view outlet
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('app-shell').style.display = 'flex';

        // Connect WebSockets
        SocketClient.connect();

        // Redirect to dashboard page
        window.location.hash = '#/dashboard';
        APP.showToast('Authentication Successful', 'success');
      }
    } catch (error) {
      APP.showToast(error.message || 'Invalid email or password', 'error');
      // Restore button status
      submitBtn.innerHTML = '<span>Sign In</span>';
      submitBtn.disabled = false;
    }
  }
};
