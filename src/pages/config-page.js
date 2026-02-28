/**
 * Config Page — Manage locations, routes, view thresholds
 * Replaces the previous About page's settings role
 */

import { divisions } from '../data/divisions.js';
import { products } from '../data/products.js';
import { defaultLocations, getAllLocations, addCustomLocation, removeCustomLocation, LocationType } from '../data/locations.js';
import { defaultRoutes, getAllRoutes, addCustomRoute, removeCustomRoute, TransportType, getTransportLabel } from '../data/routes.js';
import { internalThresholds, operationLabels } from '../data/loss-thresholds.js';
import { showConfirm, showPrompt, showError } from './shared.js';

export function renderConfigPage() {
    const page = document.createElement('div');
    page.className = 'page';

    page.innerHTML = `
        <h1 class="page-title">Settings</h1>
        
        <!-- Theme Toggle -->
        <div class="card">
            <div class="card-title">Theme</div>
            <div class="segmented" style="margin-top: var(--spacing-sm);">
                <input type="radio" name="theme" id="themeDark" value="dark" ${document.documentElement.getAttribute('data-theme') !== 'light' ? 'checked' : ''}>
                <label for="themeDark">🌙 Dark</label>
                <input type="radio" name="theme" id="themeLight" value="light" ${document.documentElement.getAttribute('data-theme') === 'light' ? 'checked' : ''}>
                <label for="themeLight">☀️ Light</label>
            </div>
        </div>
        
        <!-- Divisions -->
        <div class="card">
            <div class="card-title">Divisions</div>
            <div style="margin-top: var(--spacing-sm);">
                ${divisions.map(d => `
                    <div style="display: flex; justify-content: space-between; padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--border);">
                        <span style="font-weight: 600;">${d.code}</span>
                        <span style="color: var(--text-secondary); font-size: var(--font-sm);">${d.name} (${d.country})</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Products -->
        <div class="card">
            <div class="card-title">Products</div>
            <div style="margin-top: var(--spacing-sm);">
                ${products.map(p => `
                    <div style="display: flex; justify-content: space-between; padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--border);">
                        <span style="font-weight: 500;">${p.name}</span>
                        <span style="color: var(--text-muted); font-size: var(--font-xs);">${p.category} (${p.densityRange[0]}–${p.densityRange[1]})</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Locations -->
        <div class="card">
            <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
                Locations
                <button class="btn-icon" id="addLocationBtn" style="padding: 4px 8px; font-size: 14px;">+</button>
            </div>
            <div id="locationsList" style="margin-top: var(--spacing-sm);">
                ${renderLocationsList()}
            </div>
        </div>
        
        <!-- Routes -->
        <div class="card">
            <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
                Routes
                <button class="btn-icon" id="addRouteBtn" style="padding: 4px 8px; font-size: 14px;">+</button>
            </div>
            <div id="routesList" style="margin-top: var(--spacing-sm);">
                ${renderRoutesList()}
            </div>
        </div>
        
        <!-- Loss Thresholds Summary -->
        <div class="card">
            <div class="card-title">Internal Loss Thresholds</div>
            <div style="margin-top: var(--spacing-sm); font-size: var(--font-xs);">
                ${renderThresholdsSummary()}
            </div>
        </div>
        
        <!-- App Version -->
        <div style="text-align: center; margin-top: var(--spacing-xl); color: var(--text-muted); font-size: var(--font-xs);">
            OilCalcApp v2.0 — Petroleum Product Loss Control
            <br>ASTM D1250 + Table 56 | KMGI-QCLP-PO-00-115-V2
        </div>
    `;

    // Setup event listeners
    setTimeout(() => {
        // Theme toggle
        page.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                    localStorage.setItem('oilcalc-theme', 'light');
                } else {
                    document.documentElement.removeAttribute('data-theme');
                    localStorage.setItem('oilcalc-theme', 'dark');
                }
            });
        });

        // Add location
        page.querySelector('#addLocationBtn')?.addEventListener('click', async () => {
            const name = await showPrompt({ title: 'New Location', message: 'Enter location name:', placeholder: 'e.g. Depot Constanta' });
            if (!name) return;
            addCustomLocation({
                type: LocationType.DEPOT,
                name,
                nameRu: name,
                city: name,
                country: 'RO',
                division: 'DWS',
            });
            page.querySelector('#locationsList').innerHTML = renderLocationsList();
            showError('Location added'); // reuse toast
        });

        // Add route
        page.querySelector('#addRouteBtn')?.addEventListener('click', async () => {
            const name = await showPrompt({ title: 'New Route', message: 'Enter route name:', placeholder: 'e.g. Depot A → Depot B' });
            if (!name) return;
            addCustomRoute({
                from: '', to: '',
                transport: TransportType.TRUCK,
                name,
                division: 'DWS',
            });
            page.querySelector('#routesList').innerHTML = renderRoutesList();
            showError('Route added');
        });
    }, 0);

    return page;
}

function renderLocationsList() {
    return getAllLocations().map(loc => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--border);">
            <div>
                <span style="font-weight: 500;">${loc.name}</span>
                <span style="font-size: var(--font-xs); color: var(--text-muted); margin-left: var(--spacing-sm);">${loc.type} · ${loc.country}</span>
            </div>
            ${loc.custom ? `<button class="btn-danger" onclick="this.closest('.card').querySelector('#locationsList').innerHTML = ''; document.dispatchEvent(new CustomEvent('removeLocation', {detail: '${loc.id}'}))">✕</button>` : ''}
        </div>
    `).join('');
}

function renderRoutesList() {
    return getAllRoutes().map(route => {
        const transport = getTransportLabel(route.transport);
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--border);">
                <div>
                    <span style="font-weight: 500;">${transport.icon} ${route.name}</span>
                    <span style="font-size: var(--font-xs); color: var(--text-muted); margin-left: var(--spacing-sm);">${route.division}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderThresholdsSummary() {
    const byDivision = {};
    internalThresholds.forEach(t => {
        if (!byDivision[t.division]) byDivision[t.division] = [];
        byDivision[t.division].push(t);
    });

    return Object.entries(byDivision).map(([div, thresholds]) => `
        <div style="margin-bottom: var(--spacing-md);">
            <div style="font-weight: 700; font-size: var(--font-sm); color: var(--accent); margin-bottom: var(--spacing-xs);">${div}</div>
            ${thresholds.map(t => {
        const opLabel = operationLabels[t.operation] || t.operation;
        const product = t.product === '*' ? 'All' : t.product;
        const pct = t.perUnit?.percent ? `${t.perUnit.percent}%` : (t.perMonth?.percent || t.perMonth?.summer ? `${t.perMonth.percent || t.perMonth.summer}%/mo` : '—');
        return `<div style="display: flex; justify-content: space-between; padding: 2px 0;"><span style="color: var(--text-secondary);">${opLabel} · ${product}</span><span style="font-variant-numeric: tabular-nums;">${pct}</span></div>`;
    }).join('')}
        </div>
    `).join('');
}
