/**
 * Dashboard Page — Overview of shipments with loss status KPIs
 */

import { ShipmentService } from '../services/shipment-service.js';
import { getLossStatusDisplay } from '../domain/loss-evaluator.js';
import { getProduct } from '../data/products.js';
import { getDivision } from '../data/divisions.js';
import { getRoute, getTransportLabel } from '../data/routes.js';
import { formatMass, formatLossPercent } from '../domain/formatters.js';

export function renderDashboardPage() {
    const page = document.createElement('div');
    page.className = 'page';

    const stats = ShipmentService.getStats();
    const shipments = ShipmentService.loadAll();
    const recent = shipments.slice(0, 10);

    page.innerHTML = `
        <h1 class="page-title">Dashboard</h1>
        
        <!-- KPI Cards -->
        <div class="kpi-grid">
            ${renderKPI('Total', stats.total, '📊', 'var(--blue)')}
            ${renderKPI('OK', stats.withinNorm, '✅', '#22c55e')}
            ${renderKPI('Warning', stats.warning, '⚠️', '#f59e0b')}
            ${renderKPI('Critical', stats.critical, '🔴', '#ef4444')}
        </div>
        
        <!-- Recent Shipments -->
        <h2 class="section-title" style="margin-top: var(--spacing-lg);">Recent Shipments</h2>
        
        <div id="recentList">
            ${recent.length === 0 ? renderEmptyState() : recent.map(renderShipmentItem).join('')}
        </div>
    `;

    return page;
}

function renderKPI(label, value, icon, color) {
    return `
        <div class="card kpi-card" style="flex: 1; text-align: center; min-width: 0;">
            <div style="font-size: 1.5rem; margin-bottom: 4px;">${icon}</div>
            <div style="font-size: var(--font-2xl); font-weight: 800; color: ${color}; font-variant-numeric: tabular-nums;">${value}</div>
            <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-top: 2px;">${label}</div>
        </div>
    `;
}

function renderEmptyState() {
    return `
        <div class="card" style="text-align: center; padding: var(--spacing-xl);">
            <div style="font-size: 2.5rem; margin-bottom: var(--spacing-md);">📦</div>
            <div style="color: var(--text-secondary);">No shipments yet</div>
            <div style="font-size: var(--font-sm); color: var(--text-muted); margin-top: var(--spacing-xs);">Create your first shipment from the Shipment tab</div>
        </div>
    `;
}

function renderShipmentItem(s) {
    const statusDisplay = getLossStatusDisplay(s.lossStatus);
    const product = getProduct(s.product);
    const division = getDivision(s.division);
    const route = getRoute(s.routeId);
    const transport = getTransportLabel(s.transportType);

    const dateStr = new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const lossStr = s.result?.evaluation?.lossPercent !== undefined
        ? formatLossPercent(s.result.evaluation.lossPercent)
        : '—';
    const massStr = s.result?.deltaMassKg !== undefined
        ? formatMass(s.result.deltaMassKg) + ' kg'
        : '—';

    return `
        <div class="history-item">
            <div class="history-header">
                <span class="history-type">${statusDisplay.icon} ${division?.code || s.division}</span>
                <span style="font-size: var(--font-xs); color: var(--text-muted);">${dateStr}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacing-xs);">
                <div>
                    <div style="font-size: var(--font-sm); color: var(--text-secondary);">
                        ${transport?.icon || ''} ${product?.name || s.product}
                    </div>
                    ${s.batchNumber ? `<div style="font-size: var(--font-xs); color: var(--text-muted);">${s.batchNumber}</div>` : ''}
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 700; color: ${statusDisplay.color}; font-variant-numeric: tabular-nums;">${lossStr}</div>
                    <div style="font-size: var(--font-xs); color: var(--text-secondary); font-variant-numeric: tabular-nums;">${massStr}</div>
                </div>
            </div>
        </div>
    `;
}
