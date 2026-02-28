/**
 * History Page — Port of HistoryView.swift
 */

import { HistoryService } from '../services/history-service.js';
import { formatMass, formatVolume, formatPercent } from '../domain/formatters.js';
import { showConfirm, showResultModal } from './shared.js';
import { CalculationType } from '../domain/models.js';

export function renderHistoryPage() {
    const page = document.createElement('div');
    page.className = 'page';

    const history = HistoryService.loadHistory();

    if (history.length === 0) {
        page.innerHTML = `
      <h1 class="page-title">History</h1>
      <div class="empty-state">
        <div class="empty-icon">🕐</div>
        <div class="empty-text">History is empty</div>
      </div>
    `;
        return page;
    }

    page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">History</h1>
      <button class="toolbar-btn danger" id="clearAllBtn">Clear All</button>
    </div>
    <div id="historyList"></div>
  `;

    const list = page.querySelector('#historyList');
    renderItems(list, history);

    // Clear all
    page.querySelector('#clearAllBtn').addEventListener('click', async () => {
        const ok = await showConfirm({
            title: 'Clear all history?',
            message: 'All records will be deleted permanently.',
            confirmText: 'Clear',
            danger: true,
        });
        if (ok) {
            HistoryService.clearHistory();
            refreshHistoryPage();
        }
    });

    return page;
}

function renderItems(container, history) {
    container.innerHTML = '';
    history.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'history-item';

        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        const typeName = entry.type === CalculationType.MAIN_CALC ? 'Calculator' : 'Loss Analysis';

        let details = '';
        if (entry.dualResult) {
            details = `At 15°C: ${formatVolume(entry.dualResult.at15)} l  |  At T: ${formatVolume(entry.dualResult.atT)} l`;
        }
        if (entry.tripResult) {
            details = `Δ Mass: ${formatMass(entry.tripResult.totalDelta?.massKg ?? entry.tripResult.deltaMassKg ?? 0)} kg`;
            if (entry.tripResult.totalDelta?.v15 != null) {
                details += `  |  Δ Vol (15°C): ${formatVolume(entry.tripResult.totalDelta.v15)} l`;
            }
        }

        item.innerHTML = `
      <div class="history-header">
        <span class="history-type">${typeName}</span>
        <span class="history-date">${dateStr}</span>
      </div>
      <div class="history-detail">${details}</div>
      <button class="history-delete btn-danger" data-id="${entry.id}" title="Delete">✕</button>
    `;

        // Click to view detail
        item.addEventListener('click', (e) => {
            if (e.target.closest('.history-delete')) return;
            showEntryDetail(entry);
        });

        // Delete
        item.querySelector('.history-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            HistoryService.removeEntry(entry.id);
            refreshHistoryPage();
        });

        container.appendChild(item);
    });
}

function showEntryDetail(entry) {
    if (entry.tripResult) {
        showTripHistoryResult(entry.tripResult, entry);
    } else if (entry.dualResult) {
        const r = entry.dualResult;
        const isDirect = entry.parameters?.mode === 'massToLiters';
        let rows = '';

        // Mode
        rows += `<div class="result-row"><span class="label">Mode</span><span class="value">${isDirect ? 'Mass → Liters' : 'Liters → Mass'}</span></div>`;
        rows += '<hr class="result-divider">';

        // Input data
        if (entry.parameters?.input) {
            const inputLabel = isDirect ? 'Mass (input)' : 'Volume (input)';
            const inputUnit = isDirect ? ' kg' : ' l';
            rows += `<div class="result-row"><span class="label">${inputLabel}</span><span class="value">${entry.parameters.input}${inputUnit}</span></div>`;
        }
        if (entry.parameters?.density) {
            rows += `<div class="result-row"><span class="label">Density</span><span class="value">${entry.parameters.density} kg/l</span></div>`;
        }
        if (entry.parameters?.temperature) {
            rows += `<div class="result-row"><span class="label">Temperature</span><span class="value">${entry.parameters.temperature}°C</span></div>`;
        }
        if (entry.parameters?.productType) {
            rows += `<div class="result-row"><span class="label">Product</span><span class="value">${entry.parameters.productType === 'crudeOil' ? 'Crude Oil' : 'Refined'}</span></div>`;
        }
        if (entry.parameters?.densityMode) {
            rows += `<div class="result-row"><span class="label">Density Mode</span><span class="value">${entry.parameters.densityMode === 'd15' ? 'At 15°C' : 'At T°C'}</span></div>`;
        }

        rows += '<hr class="result-divider">';

        // Results
        if (isDirect) {
            rows += `<div class="result-row"><span class="label">Volume at 15°C</span><span class="value accent">${formatVolume(r.at15)} l</span></div>`;
            rows += `<div class="result-row"><span class="label">Volume at T°C</span><span class="value accent">${formatVolume(r.atT)} l</span></div>`;
        } else {
            rows += `<div class="result-row"><span class="label">Mass at 15°C</span><span class="value accent">${formatMass(r.at15)} kg</span></div>`;
            rows += `<div class="result-row"><span class="label">Mass at T°C</span><span class="value accent">${formatMass(r.atT)} kg</span></div>`;
        }

        showResultModal('Calculator Result', `<div class="result-card">${rows}</div>`);
    }
}

function showTripHistoryResult(tripResult, entry) {
    let html = '';

    // Total Analysis
    const d = tripResult.totalDelta || {};
    const mc = (d.massKg ?? 0) >= 0 ? 'positive' : 'negative';
    const v15c = (d.v15 ?? 0) >= 0 ? 'positive' : 'negative';
    const vfc = (d.vFact ?? 0) >= 0 ? 'positive' : 'negative';

    html += '<div class="result-card">';
    html += '<div class="section-title" style="margin-top:0;">Total Analysis</div>';
    html += '<hr class="result-divider">';
    html += `
    <div class="delta-row">
      <span class="delta-label">Δ Mass</span>
      <div class="delta-values">
        <span class="delta-main ${mc}">${formatMass(d.massKg ?? 0)} kg</span>
        <span class="delta-percent ${mc}">(${formatPercent(d.massPercent ?? 0)}%)</span>
      </div>
    </div>
    <hr class="result-divider">
    <div class="delta-row">
      <span class="delta-label">Δ Volume (15°C)</span>
      <div class="delta-values">
        <span class="delta-main ${v15c}">${formatVolume(d.v15 ?? 0)} l</span>
        <span class="delta-percent ${v15c}">(${formatPercent(d.v15Percent ?? 0)}%)</span>
      </div>
    </div>`;
    if (d.vFact != null) {
        html += `
    <hr class="result-divider">
    <div class="delta-row">
      <span class="delta-label">Δ Volume (Fact)</span>
      <div class="delta-values">
        <span class="delta-main ${vfc}">${formatVolume(d.vFact ?? 0)} l</span>
        <span class="delta-percent ${vfc}">(${formatPercent(d.vFactPercent ?? 0)}%)</span>
      </div>
    </div>`;
    }
    html += '</div>';

    // Product type
    if (entry?.parameters?.productType) {
        html += `<div style="text-align:center; font-size:var(--font-xs); color:var(--text-muted); margin: var(--spacing-xs) 0;">
            Product: ${entry.parameters.productType === 'crudeOil' ? 'Crude Oil' : 'Refined Products'}
        </div>`;
    }

    // Measurement Points
    if (tripResult.points && tripResult.points.length > 0) {
        html += '<div class="section-title">Measurement Points</div>';
        tripResult.points.forEach((point, i) => {
            const label = point.name || `Point ${i + 1}`;
            // Get input data from saved params if available
            const inputPoint = entry?.parameters?.points?.[i];
            html += `<div class="result-card">
                <div style="font-weight:700; margin-bottom:var(--spacing-xs); color:var(--text-primary);">${label}</div>
                <div class="result-row"><span class="label">Mass</span><span class="value">${formatMass(point.massKg)} kg</span></div>
                <div class="result-row"><span class="label">Density (15°C)</span><span class="value">${point.density15?.toFixed(4) ?? '-'} kg/l</span></div>
                <div class="result-row"><span class="label">Temperature</span><span class="value">${point.temperature?.toFixed(1) ?? '-'}°C</span></div>
                <hr class="result-divider">
                <div class="result-row"><span class="label">Volume (15°C)</span><span class="value accent">${formatVolume(point.v15Liters)} l</span></div>
                <div class="result-row"><span class="label">Volume (@ T°C)</span><span class="value accent">${formatVolume(point.vFactLiters)} l</span></div>
            </div>`;
        });
    } else if (entry?.parameters?.points) {
        // Fallback: show saved input parameters if result points not available
        html += '<div class="section-title">Input Data</div>';
        entry.parameters.points.forEach((p, i) => {
            html += `<div class="result-card">
                <div style="font-weight:700; margin-bottom:var(--spacing-xs);">${p.name || 'Point ' + (i + 1)}</div>
                <div class="result-row"><span class="label">Mass</span><span class="value">${p.mass} kg</span></div>
                <div class="result-row"><span class="label">Density</span><span class="value">${p.density} kg/l</span></div>
                <div class="result-row"><span class="label">Temperature</span><span class="value">${p.temperature}°C</span></div>
            </div>`;
        });
    }

    // Segments
    if (tripResult.segments && tripResult.segments.length > 0) {
        html += '<div class="section-title">Segment Analysis</div>';
        tripResult.segments.forEach((seg, i) => {
            const segDelta = seg.delta || {};
            const smc = (segDelta.massKg ?? 0) >= 0 ? 'positive' : 'negative';
            const sv15c = (segDelta.v15 ?? 0) >= 0 ? 'positive' : 'negative';
            html += `<div class="result-card">
                <div style="font-weight:600; margin-bottom:var(--spacing-sm);">
                    ${seg.fromPoint?.name || 'Start'} → ${seg.toPoint?.name || 'End'}
                </div>
                <div class="delta-row">
                    <span class="delta-label">Δ Mass</span>
                    <div class="delta-values">
                        <span class="delta-main ${smc}">${formatMass(segDelta.massKg ?? 0)} kg</span>
                        <span class="delta-percent ${smc}">(${formatPercent(segDelta.massPercent ?? 0)}%)</span>
                    </div>
                </div>
                <hr class="result-divider">
                <div class="delta-row">
                    <span class="delta-label">Δ Vol (15°C)</span>
                    <div class="delta-values">
                        <span class="delta-main ${sv15c}">${formatVolume(segDelta.v15 ?? 0)} l</span>
                        <span class="delta-percent ${sv15c}">(${formatPercent(segDelta.v15Percent ?? 0)}%)</span>
                    </div>
                </div>
            </div>`;
        });
    }

    showResultModal('Trip Loss (History)', html);
}

function refreshHistoryPage() {
    const container = document.querySelector('.page-container');
    if (container) {
        container.innerHTML = '';
        container.appendChild(renderHistoryPage());
    }
}
