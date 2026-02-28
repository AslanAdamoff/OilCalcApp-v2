/**
 * OilCalcApp Web — Main Entry Point
 * SPA with bottom tab navigation
 */

import './styles/index.css';

// Apply saved theme immediately
const savedTheme = localStorage.getItem('oilcalc-theme');
if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
}

import { renderCalculatorPage } from './pages/calculator-page.js';
import { renderTripPage } from './pages/trip-page.js';
import { renderHistoryPage } from './pages/history-page.js';
import { renderAboutPage } from './pages/about-page.js';

// Professional SVG icons (24x24, stroke-based, currentColor)
const icons = {
    calculator: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="16" y2="18"/></svg>',
    trip: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 9v1a6 6 0 0 0 6 6h1"/><path d="M17 14l4 4-4 4"/></svg>',
    history: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    about: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
};

const tabs = [
    { id: 'calculator', icon: icons.calculator, label: 'Calculator', render: renderCalculatorPage },
    { id: 'trip', icon: icons.trip, label: 'Trip Loss', render: renderTripPage },
    { id: 'history', icon: icons.history, label: 'History', render: renderHistoryPage },
    { id: 'about', icon: icons.about, label: 'About', render: renderAboutPage },
];

let currentTab = 'calculator';

/**
 * iOS Safari viewport height fix.
 * On iPhone Safari, CSS 100vh includes the area behind the toolbar,
 * making the actual visible area shorter. This uses window.innerHeight
 * which gives the TRUE visible viewport height.
 * We skip updates when the keyboard is open to prevent the tab bar jump.
 */
let initialHeight = 0;
let keyboardOpen = false;

function setAppHeight() {
    if (keyboardOpen) return; // Don't resize while keyboard is open
    const vh = window.innerHeight;
    if (!initialHeight) initialHeight = vh;
    document.documentElement.style.setProperty('--app-height', `${vh}px`);
}

function init() {
    // Set real viewport height immediately and on every resize/orientation change
    setAppHeight();
    window.addEventListener('resize', () => {
        if (!keyboardOpen) setAppHeight();
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(setAppHeight, 100);
    });

    // Also listen to visualViewport resize for iOS Safari toolbar show/hide
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            if (!keyboardOpen) setAppHeight();
        });
    }

    // Hide tab bar when keyboard opens (input focus)
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
            // Restore correct height after keyboard closes
            setTimeout(setAppHeight, 300);
        }
    });

    const app = document.getElementById('app');
    app.innerHTML = `
    <div class="page-container" id="pageContainer"></div>
    <nav class="tab-bar" id="tabBar"></nav>
  `;

    renderTabBar();
    switchTab(currentTab);

    // Dismiss splash screen after minimum 2 seconds
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
}

function renderTabBar() {
    const tabBar = document.getElementById('tabBar');
    tabBar.innerHTML = tabs.map(tab => `
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

    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        container.appendChild(tab.render());
    }

    // Update tab bar active states
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);
