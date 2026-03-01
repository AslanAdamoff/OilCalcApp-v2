/**
 * Operation Details Page — Full detail view for a single shipment
 * Shows logistics metadata, measurements, loss evaluation, and threshold analysis
 */

import { getLossStatusDisplay } from '../domain/loss-evaluator.js';
import { formatMass, formatDensity, formatTemperature, formatLossPercent } from '../domain/formatters.js';
import { getDivision } from '../data/divisions.js';
import { getProduct } from '../data/products.js';
import { getRoute, getTransportLabel } from '../data/routes.js';
import { getLocation } from '../data/locations.js';

/**
 * Render the Operation Details page for a single shipment
 * @param {object} shipment - Full shipment object from Firestore
 * @param {function} onBack - Callback to return to previous view
 * @returns {HTMLElement}
 */
export function renderOperationDetails(shipment, onBack) {
    const page = document.createElement('div');
    page.className = 'page op-detail';

    const status = getLossStatusDisplay(shipment.lossStatus);
    const division = getDivision(shipment.division);
    const product = getProduct(shipment.product);
    const route = getRoute(shipment.routeId);
    const transport = getTransportLabel(shipment.transportType);
    const fromLoc = getLocation(shipment.fromLocation) || getLocation(route?.from);
    const toLoc = getLocation(shipment.toLocation) || getLocation(route?.to);
    const eval_ = shipment.result?.evaluation || {};
    const date = new Date(shipment.date);
    const dateStr = date.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit',
    });

    // Loss values
    const lossKg = Math.abs(shipment.result?.deltaMassKg || 0);
    const lossPercent = eval_.lossPercent || 0;
    const appliedThreshold = eval_.appliedThreshold || 0;
    const internalLimit = eval_.internalLimit;
    const contractualLimit = eval_.contractualLimit;

    // Bar width: loss relative to threshold (capped at 150% for visual)
    const barPercent = appliedThreshold > 0
        ? Math.min(150, (lossPercent / appliedThreshold) * 100)
        : 0;
    const barColor = status.color;

    // Loaded / Unloaded
    const loaded = shipment.loaded || {};
    const unloaded = shipment.unloaded || {};

    page.innerHTML = `
        <!-- Header -->
        <div class="op-detail-header">
            <button class="op-back-btn" id="opBackBtn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
                <span>Back</span>
            </button>
            <div class="op-header-right">
                <span class="op-status-badge ${status.cssClass}">${status.icon} ${status.label}</span>
            </div>
        </div>

        <!-- Title -->
        <div class="op-detail-title-row">
            <h1 class="op-detail-title">${transport.icon} ${route?.name || 'Shipment'}</h1>
            <div class="op-detail-date">${dateStr} · ${timeStr}</div>
        </div>

        <!-- Batch Info -->
        <div class="op-batch-row">
            ${shipment.batchNumber ? `<span class="op-batch-tag">📋 ${shipment.batchNumber}</span>` : ''}
            ${shipment.blNumber ? `<span class="op-batch-tag">🔖 ${shipment.blNumber}</span>` : ''}
            ${shipment.season ? `<span class="op-batch-tag">🌡️ ${shipment.season === 'summer' ? 'Summer' : 'Winter'}</span>` : ''}
        </div>

        <!-- Logistics Info -->
        <div class="op-detail-section">
            <div class="op-section-title">Logistics Information</div>
            <div class="op-info-grid">
                <div class="op-info-item">
                    <span class="op-info-label">Division</span>
                    <span class="op-info-value">${division ? `${division.code} — ${division.name}` : shipment.division}</span>
                </div>
                <div class="op-info-item">
                    <span class="op-info-label">Product</span>
                    <span class="op-info-value">${product?.name || shipment.product}</span>
                </div>
                <div class="op-info-item">
                    <span class="op-info-label">Transport</span>
                    <span class="op-info-value">${transport.icon} ${transport.name}</span>
                </div>
                <div class="op-info-item">
                    <span class="op-info-label">Country</span>
                    <span class="op-info-value">${division?.countryName || '—'}</span>
                </div>
                <div class="op-info-item op-info-full">
                    <span class="op-info-label">Route</span>
                    <span class="op-info-value op-route-value">
                        <span class="op-route-point">${fromLoc?.name || route?.from || '—'}</span>
                        <span class="op-route-arrow">→</span>
                        <span class="op-route-point">${toLoc?.name || route?.to || '—'}</span>
                    </span>
                </div>
            </div>
        </div>

        <!-- Measurements -->
        <div class="op-detail-section">
            <div class="op-section-title">Measurements</div>
            <div class="op-measurement-grid">
                <div class="op-measurement-card op-loaded">
                    <div class="op-measurement-header">
                        <span class="op-measurement-icon">📥</span>
                        <span class="op-measurement-label">Loaded</span>
                    </div>
                    <div class="op-measurement-body">
                        <div class="op-meas-row">
                            <span class="op-meas-label">Mass</span>
                            <span class="op-meas-value">${formatMass(loaded.massKg || 0)} kg</span>
                        </div>
                        <div class="op-meas-row">
                            <span class="op-meas-label">Density</span>
                            <span class="op-meas-value">${loaded.density ? formatDensity(loaded.density) : '—'} kg/l</span>
                        </div>
                        <div class="op-meas-row">
                            <span class="op-meas-label">Temperature</span>
                            <span class="op-meas-value">${loaded.temperature != null ? formatTemperature(loaded.temperature) + '°C' : '—'}</span>
                        </div>
                        <div class="op-meas-row">
                            <span class="op-meas-label">Density Mode</span>
                            <span class="op-meas-value">${loaded.densityMode === 'at15' ? 'At 15°C' : 'At T°C'}</span>
                        </div>
                    </div>
                </div>
                <div class="op-measurement-card op-unloaded">
                    <div class="op-measurement-header">
                        <span class="op-measurement-icon">📤</span>
                        <span class="op-measurement-label">Unloaded</span>
                    </div>
                    <div class="op-measurement-body">
                        <div class="op-meas-row">
                            <span class="op-meas-label">Mass</span>
                            <span class="op-meas-value">${formatMass(unloaded.massKg || 0)} kg</span>
                        </div>
                        <div class="op-meas-row">
                            <span class="op-meas-label">Density</span>
                            <span class="op-meas-value">${unloaded.density ? formatDensity(unloaded.density) : '—'} kg/l</span>
                        </div>
                        <div class="op-meas-row">
                            <span class="op-meas-label">Temperature</span>
                            <span class="op-meas-value">${unloaded.temperature != null ? formatTemperature(unloaded.temperature) + '°C' : '—'}</span>
                        </div>
                        <div class="op-meas-row">
                            <span class="op-meas-label">Density Mode</span>
                            <span class="op-meas-value">${unloaded.densityMode === 'at15' ? 'At 15°C' : 'At T°C'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loss Analysis -->
        <div class="op-detail-section op-loss-section">
            <div class="op-section-title">Loss Analysis</div>
            <div class="op-loss-main">
                <div class="op-loss-delta">
                    <div class="op-loss-delta-label">Mass Loss</div>
                    <div class="op-loss-delta-value" style="color:${barColor}">
                        −${formatMass(lossKg)} kg
                    </div>
                    <div class="op-loss-percent" style="color:${barColor}">
                        ${formatLossPercent(-lossPercent)}
                    </div>
                </div>
                ${appliedThreshold > 0 ? `
                <div class="op-loss-bar-container">
                    <div class="op-loss-bar-labels">
                        <span>0%</span>
                        <span class="op-loss-bar-threshold-label">Threshold: ${appliedThreshold}%</span>
                    </div>
                    <div class="op-loss-bar-track">
                        <div class="op-loss-bar-fill" style="width:${Math.min(100, barPercent)}%;background:${barColor}"></div>
                        <div class="op-loss-bar-threshold" style="left:${Math.min(100, (100 / 150) * 100)}%"></div>
                    </div>
                    <div class="op-loss-bar-value">${lossPercent.toFixed(3)}% of ${appliedThreshold}%</div>
                </div>
                ` : ''}
            </div>

            <!-- Threshold Details -->
            <div class="op-threshold-details">
                <div class="op-section-subtitle">Threshold Details</div>
                <div class="op-info-grid">
                    ${internalLimit != null ? `
                    <div class="op-info-item">
                        <span class="op-info-label">Internal Limit</span>
                        <span class="op-info-value">${internalLimit}%</span>
                    </div>
                    ` : ''}
                    ${contractualLimit != null ? `
                    <div class="op-info-item">
                        <span class="op-info-label">Contractual Limit</span>
                        <span class="op-info-value">${contractualLimit}%</span>
                    </div>
                    ` : ''}
                    <div class="op-info-item">
                        <span class="op-info-label">Status</span>
                        <span class="op-info-value">${status.icon} ${status.label}</span>
                    </div>
                    <div class="op-info-item">
                        <span class="op-info-label">Season</span>
                        <span class="op-info-value">${eval_.season === 'summer' ? '☀️ Summer' : '❄️ Winter'}</span>
                    </div>
                </div>
                ${eval_.message ? `
                <div class="op-eval-message ${status.cssClass}">
                    ${eval_.message}
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Notes -->
        ${shipment.notes ? `
        <div class="op-detail-section">
            <div class="op-section-title">Notes</div>
            <div class="op-notes-content">${shipment.notes}</div>
        </div>
        ` : ''}

        <!-- Meta Footer -->
        <div class="op-detail-meta">
            ${shipment.createdBy ? `<span>Created by: ${shipment.createdBy}</span>` : ''}
            ${shipment.result?.completedAt ? `<span>Completed: ${new Date(shipment.result.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>` : ''}
            <span class="op-id-tag">ID: ${shipment.id.slice(0, 8)}…</span>
        </div>
    `;

    // Back button handler
    page.querySelector('#opBackBtn').addEventListener('click', () => {
        if (onBack) onBack();
    });

    return page;
}
