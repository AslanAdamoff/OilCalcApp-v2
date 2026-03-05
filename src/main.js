/**
 * OilCalcApp Web — Main Entry Point
 * SPA with auth gate and role-based tab navigation
 */

import './styles/base.css';
import './styles/dashboard.css';
import './styles/pages.css';

// Apply saved theme immediately (supports 'dark', 'light', 'auto')
const savedTheme = localStorage.getItem('oilcalc-theme') || 'auto';
function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (!prefersDark) {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}
applyTheme(savedTheme);

// Listen for system theme changes when in auto mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = localStorage.getItem('oilcalc-theme') || 'auto';
    if (current === 'auto') applyTheme('auto');
});

import { renderShipmentPage } from './pages/shipment-page.js';
import { renderCalculatorPage } from './pages/calculator-page.js';
import { renderDashboardPage } from './pages/dashboard-page.js';
import { renderHistoryPage } from './pages/history-page.js';
import { renderConfigPage } from './pages/config-page.js';
import { renderAdminPage } from './pages/admin-page.js';
import { renderLoginPage } from './pages/login-page.js';
import { isAuthenticated, getCurrentUser, getAllowedTabs, logout } from './services/auth-service.js';
import { checkForNewAlerts, getNotifications, getUnreadCount, markAsRead, markAllAsRead } from './services/notification-service.js';

// Professional SVG icons (24x24, stroke-based, currentColor)
const icons = {
    shipment: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="22" height="12" rx="2"/><path d="M1 10h22"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M5 6V4a1 1 0 0 1 1-1h4"/></svg>',
    calculator: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="16" y2="18"/></svg>',
    dashboard: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="11" rx="1"/><rect x="3" y="13" width="7" height="8" rx="1"/></svg>',
    history: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    settings: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    admin: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    logout: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
};

const allTabs = [
    { id: 'shipment', icon: icons.shipment, label: 'Shipment', render: renderShipmentPage },
    { id: 'calculator', icon: icons.calculator, label: 'Calc', render: renderCalculatorPage },
    { id: 'dashboard', icon: icons.dashboard, label: 'Dashboard', render: renderDashboardPage },
    { id: 'history', icon: icons.history, label: 'History', render: renderHistoryPage },
    { id: 'settings', icon: icons.settings, label: 'Settings', render: renderConfigPage },
    { id: 'admin', icon: icons.admin, label: 'Users', render: renderAdminPage },
];

let currentTab = '';
let visibleTabs = [];

/**
 * iOS Safari viewport height fix.
 */
let initialHeight = 0;
let keyboardOpen = false;

function setAppHeight() {
    if (keyboardOpen) return;
    const vh = window.innerHeight;
    if (!initialHeight) initialHeight = vh;
    document.documentElement.style.setProperty('--app-height', `${vh}px`);
}

function init() {
    setAppHeight();
    window.addEventListener('resize', () => {
        if (!keyboardOpen) setAppHeight();
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(setAppHeight, 100);
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            if (!keyboardOpen) setAppHeight();
        });
    }

    // Keyboard handling
    document.addEventListener('focusin', (e) => {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            keyboardOpen = true;
            const tabBar = document.getElementById('tabBar');
            if (tabBar) tabBar.style.display = 'none';
        }
    });

    document.addEventListener('focusout', (e) => {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            keyboardOpen = false;
            const tabBar = document.getElementById('tabBar');
            if (tabBar) tabBar.style.display = '';
            setTimeout(setAppHeight, 300);
        }
    });

    // Check auth
    if (isAuthenticated()) {
        showApp();
    } else {
        showLogin();
    }

    // Dismiss splash
    const splashMinTime = 2000;
    const startTime = performance.timing.navigationStart || Date.now();
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, splashMinTime - elapsed);

    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => splash.remove(), 700);
        }
    }, remaining);

    // PWA Install Prompt
    setupPWAInstallPrompt();
}

function showLogin() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(renderLoginPage((user) => {
        showApp();
    }));
}

function showApp() {
    const app = document.getElementById('app');
    const user = getCurrentUser();
    const allowedTabIds = getAllowedTabs();

    visibleTabs = allTabs.filter(t => allowedTabIds.includes(t.id));
    currentTab = visibleTabs[0]?.id || 'shipment';

    app.innerHTML = `
        <div class="app-header" id="appHeader">
            <div class="app-header-user">
                <span class="user-name">${user?.name || user?.email || 'User'}</span>
                <span class="user-role-badge">${user?.role || ''}</span>
            </div>
            <div class="app-header-actions">
                <div class="notif-wrapper" id="notifWrapper">
                    <button class="btn-icon notif-bell" id="notifBellBtn" title="Notifications">
                        🔔
                        <span class="notif-badge" id="notifBadge" style="display:none">0</span>
                    </button>
                    <div class="notif-dropdown" id="notifDropdown" style="display:none">
                        <div class="notif-dropdown-header">
                            <span class="notif-dropdown-title">Notifications</span>
                            <button class="notif-mark-all" id="notifMarkAll">Mark all read</button>
                        </div>
                        <div class="notif-dropdown-list" id="notifList"></div>
                    </div>
                </div>
                <button class="btn-icon logout-btn" id="logoutBtn" title="Sign Out">
                    ${icons.logout}
                </button>
            </div>
        </div>
        <div class="page-container" id="pageContainer"></div>
        <nav class="tab-bar" id="tabBar"></nav>
    `;

    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('Sign out?')) {
            logout();
            showLogin();
        }
    });

    renderTabBar();
    switchTab(currentTab);


    // Notification bell setup
    setupNotifications();
}

function renderTabBar() {
    const tabBar = document.getElementById('tabBar');
    tabBar.innerHTML = visibleTabs.map(tab => `
    <button class="tab-btn ${tab.id === currentTab ? 'active' : ''}" data-tab="${tab.id}">
      <span class="tab-icon">${tab.icon}</span>
      <span class="tab-label">${tab.label}</span>
    </button>
  `).join('');

    tabBar.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

function switchTab(tabId) {
    currentTab = tabId;
    const container = document.getElementById('pageContainer');
    container.innerHTML = '';
    container.scrollTop = 0;

    const tab = visibleTabs.find(t => t.id === tabId);
    if (tab) {
        container.appendChild(tab.render());
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
}

document.addEventListener('DOMContentLoaded', init);

// ── PWA Install Prompt ──────────────────────────────────────

let deferredPrompt = null;

function setupPWAInstallPrompt() {
    // Don't show if already dismissed or if in standalone mode
    if (localStorage.getItem('oilcalc-pwa-dismissed') === 'true') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showPWABanner();
    });
}

function showPWABanner() {
    // Remove existing
    document.querySelector('.pwa-banner')?.remove();

    const banner = document.createElement('div');
    banner.className = 'pwa-banner';
    banner.innerHTML = `
        <div class="pwa-banner-text">
            <strong>📲 Install OilCalcApp</strong>
            <span>Add to Home Screen for quick access</span>
        </div>
        <div class="pwa-banner-actions">
            <button class="pwa-install-btn" id="pwaInstallBtn">Install</button>
            <button class="pwa-dismiss-btn" id="pwaDismissBtn">✕</button>
        </div>
    `;

    document.body.appendChild(banner);
    // Animate in
    requestAnimationFrame(() => banner.classList.add('visible'));

    document.getElementById('pwaInstallBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
        }
        banner.remove();
    });

    document.getElementById('pwaDismissBtn').addEventListener('click', () => {
        localStorage.setItem('oilcalc-pwa-dismissed', 'true');
        banner.classList.remove('visible');
        setTimeout(() => banner.remove(), 300);
    });
}


// ── Notification System ──────────────────────────────────────

async function setupNotifications() {
    const bellBtn = document.getElementById('notifBellBtn');
    const dropdown = document.getElementById('notifDropdown');
    const markAllBtn = document.getElementById('notifMarkAll');

    if (!bellBtn || !dropdown) return;

    // Check for new alerts
    await checkForNewAlerts();
    updateNotifBadge();

    // Toggle dropdown
    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.style.display !== 'none';
        dropdown.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) renderNotifDropdown();
    });

    // Mark all read
    markAllBtn?.addEventListener('click', () => {
        markAllAsRead();
        updateNotifBadge();
        renderNotifDropdown();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#notifWrapper')) {
            dropdown.style.display = 'none';
        }
    });

    // Periodic check (every 60s)
    setInterval(async () => {
        const newCount = await checkForNewAlerts();
        if (newCount > 0) updateNotifBadge();
    }, 60000);
}

function updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const count = getUnreadCount();
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

function renderNotifDropdown() {
    const list = document.getElementById('notifList');
    if (!list) return;
    const notifs = getNotifications();

    if (notifs.length === 0) {
        list.innerHTML = '<div class="notif-empty">No notifications</div>';
        return;
    }

    list.innerHTML = notifs.slice(0, 20).map(n => `
        <div class="notif-item ${n.read ? 'read' : 'unread'}" data-notif-id="${n.id}">
            <div class="notif-item-icon">${n.type === 'critical_loss' ? '🔴' : '⚠️'}</div>
            <div class="notif-item-body">
                <div class="notif-item-title">${n.title}</div>
                <div class="notif-item-msg">${n.message}</div>
                <div class="notif-item-time">${timeAgo(n.createdAt)}</div>
            </div>
        </div>
    `).join('');

    // Click to mark as read
    list.querySelectorAll('.notif-item.unread').forEach(item => {
        item.addEventListener('click', () => {
            markAsRead(item.dataset.notifId);
            item.classList.replace('unread', 'read');
            updateNotifBadge();
        });
    });
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}
