import { DashboardPage } from './pages/Dashboard.js';
import { TradesPage } from './pages/Trades.js';
import { ReportsPage } from './pages/Reports.js';
import { SettingsPage } from './pages/Settings.js';
import { LoginPage } from './pages/Login.js';

const routes = {
  '/dashboard': DashboardPage,
  '/trades': TradesPage,
  '/reports': ReportsPage,
  '/settings': SettingsPage,
  '/login': LoginPage,
};

export const Router = {
  navigate: async () => {
    const hash = window.location.hash.slice(1) || '/dashboard';
    
    // Auth Guard check
    if (!window.Store.user) {
      // If not logged in, force Login page overlay
      LoginPage.render();
      document.getElementById('app-shell').style.display = 'none';
      document.getElementById('auth-overlay').style.display = 'flex';
      return;
    }

    // Hide auth screen and show main shell
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';

    // Highlight active sidebar navigation link
    updateActiveSidebarLink(hash);

    // Resolve Page Component
    const pageComponent = routes[hash] || DashboardPage;
    const pageTitle = hash.replace('/', '').toUpperCase();
    document.getElementById('page-title').innerText = pageTitle;

    // Render page inside outlet container
    const outlet = document.getElementById('content-outlet');
    outlet.innerHTML = '';
    const viewHTML = await pageComponent.render();
    outlet.innerHTML = viewHTML;

    // Trigger page-specific post-render hooks if defined
    if (pageComponent.onMount) {
      pageComponent.onMount();
    }
  }
};

function updateActiveSidebarLink(hash) {
  const links = document.querySelectorAll('.sidebar-nav li');
  links.forEach((li) => {
    const linkName = li.getAttribute('data-link');
    if (hash.includes(linkName)) {
      li.classList.add('active');
    } else {
      li.classList.remove('active');
    }
  });
}

// Bind router triggers to browser events
window.addEventListener('hashchange', Router.navigate);
