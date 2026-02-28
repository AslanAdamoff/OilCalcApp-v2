/**
 * Trip Loss Page — Port of TripCalcView.swift + TripCalcResultView.swift
 */

import { calculate } from '../domain/trip-loss-calculator.js';
import { validateDensity, validateTemperature, validateMass, ValidationError } from '../domain/validators.js';
import { formatMass, formatVolume, formatDensity, formatTemperature, formatPercent } from '../domain/formatters.js';
import { DensityMode, ProductType, CalculationType, createTripPoint, createTripTemplate, createHistoryEntry } from '../domain/models.js';
import { HistoryService } from '../services/history-service.js';
import { TemplateService } from '../services/template-service.js';
import { showError, showResultModal, showConfirm, showPrompt } from './shared.js';
import { fieldIcons, actionIcons } from '../shared/icons.js';

let state = {
    points: [],
    productType: ProductType.REFINED,
};

function resetToDefault() {
    state.points = [
        createTripPoint({ name: 'Point A (Loading)' }),
        createTripPoint({ name: 'Point B (Discharge)' }),
    ];
    state.productType = ProductType.REFINED;
}

if (state.points.length === 0) resetToDefault();

export function renderTripPage() {
    const page = document.createElement('div');
    page.className = 'page';

    page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Trip Loss</h1>
      <div class="dropdown-wrapper">
        <button class="btn-icon" id="tripMenuBtn">${actionIcons.menu}</button>
        <div class="dropdown-menu" id="tripMenu" style="display:none;"></div>
      </div>
    </div>

    <!-- Product Type -->
    <div class="card" style="padding: 10px;">
      <div class="segmented">
        <input type="radio" name="tripProduct" id="tpRefined" value="refined" ${state.productType === 'refined' ? 'checked' : ''}>
        <label for="tpRefined">Refined Products</label>
        <input type="radio" name="tripProduct" id="tpCrude" value="crude" ${state.productType === 'crude' ? 'checked' : ''}>
        <label for="tpCrude">Crude Oil</label>
      </div>
    </div>

    <!-- Points -->
    <div id="pointsList"></div>

    <!-- Add Point -->
    <button class="btn-secondary" id="addPointBtn">
      <span>＋</span> Add Point
    </button>

    <!-- Calculate -->
    <button class="btn-primary" id="tripCalcBtn" style="margin-top: var(--spacing-md);">Calculate Loss</button>
    <div style="height: 60px;"></div>
  `;

    // Product Type
    page.querySelectorAll('input[name="tripProduct"]').forEach(r => {
        r.addEventListener('change', (e) => { state.productType = e.target.value; });
    });

    // Render points
    const pointsList = page.querySelector('#pointsList');
    renderPoints(pointsList);

    // Add Point
    page.querySelector('#addPointBtn').addEventListener('click', () => {
        state.points.push(createTripPoint({ name: `Point ${state.points.length + 1}` }));
        renderPoints(pointsList);
    });

    // Menu
    setupMenu(page);

    // Calculate
    page.querySelector('#tripCalcBtn').addEventListener('click', doCalculate);

    return page;
}

function renderPoints(container) {
    container.innerHTML = '';
    state.points.forEach((point, index) => {
        const card = document.createElement('div');
        card.className = 'trip-point-card';
        card.innerHTML = `
      <div class="trip-point-header">
        <input type="text" class="trip-point-name" placeholder="Location Name" value="${point.name}" data-field="name">
        ${state.points.length > 2 ? `<button class="btn-danger" data-action="delete" title="Delete">${actionIcons.trash}</button>` : ''}
      </div>
      <div class="segmented" style="margin-bottom: var(--spacing-xs);">
        <input type="radio" name="dm_${point.id}" id="dm15_${point.id}" value="at15" ${point.densityMode === 'at15' ? 'checked' : ''}>
        <label for="dm15_${point.id}">Density at 15°C</label>
        <input type="radio" name="dm_${point.id}" id="dmT_${point.id}" value="atTemperature" ${point.densityMode === 'atTemperature' ? 'checked' : ''}>
        <label for="dmT_${point.id}">Density at T°C</label>
      </div>
      <div class="field-group" style="margin-top: var(--spacing-xs);">
        <div class="field-label"><span class="field-icon">${fieldIcons.mass}</span> Mass (kg)</div>
        <input type="text" inputmode="decimal" class="field-input" placeholder="1000.0" value="${point.mass}" data-field="mass">
      </div>
      <div class="field-group" style="margin-top: var(--spacing-xs);">
        <div class="field-label"><span class="field-icon">${fieldIcons.density}</span> Density (kg/l)</div>
        <input type="text" inputmode="decimal" class="field-input" placeholder="0.850" value="${point.density}" data-field="density">
      </div>
      <div class="field-group" style="margin-top: var(--spacing-xs);">
        <div class="field-label"><span class="field-icon">${fieldIcons.temperature}</span> Temperature (°C)</div>
        <input type="text" inputmode="decimal" class="field-input" placeholder="15.0" value="${point.temperature}" data-field="temperature">
      </div>
    `;

        // Bind inputs
        card.querySelectorAll('.field-input, .trip-point-name').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.dataset.field;
                let v = e.target.value;
                if (field !== 'name') {
                    v = v.replace(',', '.');
                    e.target.value = v;
                }
                point[field] = v;
            });
        });

        // Density mode
        card.querySelectorAll(`input[name="dm_${point.id}"]`).forEach(r => {
            r.addEventListener('change', (e) => { point.densityMode = e.target.value; });
        });

        // Delete
        const delBtn = card.querySelector('[data-action="delete"]');
        if (delBtn) {
            delBtn.addEventListener('click', () => {
                state.points = state.points.filter(p => p.id !== point.id);
                renderPoints(container);
            });
        }

        container.appendChild(card);
    });
}

function setupMenu(page) {
    const menuBtn = page.querySelector('#tripMenuBtn');
    const menu = page.querySelector('#tripMenu');
    let isOpen = false;

    function closeMenu() {
        menu.style.display = 'none';
        isOpen = false;
    }

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isOpen) {
            closeMenu();
            return;
        }
        const templates = TemplateService.loadTemplates();
        let items = `
      <button class="dropdown-item" data-action="save-template">${actionIcons.save} Save Template</button>
    `;

        if (templates.length > 0) {
            items += '<hr class="dropdown-divider">';
            templates.forEach(t => {
                items += `<button class="dropdown-item" data-action="load-template" data-id="${t.id}">${actionIcons.folder} ${t.name}</button>`;
            });
            items += '<hr class="dropdown-divider">';
            templates.forEach(t => {
                items += `<button class="dropdown-item danger" data-action="delete-template" data-id="${t.id}">${actionIcons.trash} Delete "${t.name}"</button>`;
            });
        }

        items += '<hr class="dropdown-divider">';
        items += `<button class="dropdown-item danger" data-action="reset">${actionIcons.reset} Reset All</button>`;

        menu.innerHTML = items;
        menu.style.display = 'block';
        isOpen = true;

        // Actions
        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', async () => {
                closeMenu();
                const action = item.dataset.action;

                if (action === 'save-template') {
                    const name = await showPrompt({
                        title: 'Save Template',
                        message: 'Enter a name for this route template',
                        placeholder: 'Template Name',
                    });
                    if (name) {
                        TemplateService.saveTemplate(createTripTemplate({
                            name,
                            points: state.points,
                            productType: state.productType,
                        }));
                    }
                } else if (action === 'load-template') {
                    const templates = TemplateService.loadTemplates();
                    const tmpl = templates.find(t => t.id === item.dataset.id);
                    if (tmpl) {
                        state.points = tmpl.points;
                        state.productType = tmpl.productType;
                        refreshTripPage();
                    }
                } else if (action === 'delete-template') {
                    TemplateService.deleteTemplate(item.dataset.id);
                } else if (action === 'reset') {
                    resetToDefault();
                    refreshTripPage();
                }
            });
        });
    });

    // Close on outside click
    document.addEventListener('click', () => closeMenu());
}

function refreshTripPage() {
    const container = document.querySelector('.page-container');
    if (container) {
        container.innerHTML = '';
        container.appendChild(renderTripPage());
    }
}

function doCalculate() {
    // Validate
    if (state.points.length < 2) {
        showError('Calculation requires at least 2 points');
        return;
    }

    try {
        for (const p of state.points) {
            validateMass(p.mass, `Mass (${p.name})`);
            validateDensity(p.density, `Density (${p.name})`);
            validateTemperature(p.temperature, `Temperature (${p.name})`);
        }

        const result = calculate(state.points, state.productType);

        // Save history
        // Save history with full point data
        const params = {
            productType: state.productType,
            pointsCount: String(state.points.length),
            points: state.points.map(p => ({
                name: p.name,
                mass: p.mass,
                density: p.density,
                temperature: p.temperature,
                densityMode: p.densityMode,
            })),
        };
        HistoryService.addEntry(createHistoryEntry({ type: CalculationType.TRIP_CALC, tripResult: result, parameters: params }));

        showTripResult(result);
    } catch (e) {
        showError(e.message);
    }
}

function showTripResult(result) {
    let html = '';

    // Total Analysis
    html += `<div class="result-card">
    <div class="section-title" style="margin-top:0;">Total Analysis</div>
    <hr class="result-divider">
    ${renderDelta(result.totalDelta, result.points[0]?.temperature, result.points[result.points.length - 1]?.temperature)}
  </div>`;

    // Individual Points
    html += `<div class="section-title">Measurement Points</div>`;
    result.points.forEach((point, i) => {
        const label = point.name || `Point ${i + 1}`;
        html += `<div class="result-card">
      <div style="font-size: var(--font-xs); color: var(--text-muted); margin-bottom: var(--spacing-xs);">${label}</div>
      <div class="result-row"><span class="label">Mass:</span><span class="value">${formatMass(point.massKg)} kg</span></div>
      <div class="result-row"><span class="label">ρ15:</span><span class="value">${formatDensity(point.density15)} kg/l</span></div>
      <div class="result-row"><span class="label">ρ (@ ${formatTemperature(point.temperature)}°C):</span><span class="value">${formatDensity(point.densityT)} kg/l</span></div>
      <div class="result-row"><span class="label">Temperature:</span><span class="value">${formatTemperature(point.temperature)}°C</span></div>
      <hr class="result-divider">
      <div class="result-row"><span class="label">Volume (15°C):</span><span class="value accent">${formatVolume(point.v15Liters)} l</span></div>
      <div class="result-row"><span class="label">Volume (@ ${formatTemperature(point.temperature)}°C):</span><span class="value accent">${formatVolume(point.vFactLiters)} l</span></div>
    </div>`;
    });

    // Segments
    if (result.segments.length > 0) {
        html += `<div class="section-title">Segment Analysis</div>`;
        result.segments.forEach((seg, i) => {
            html += `<div class="result-card">
        <div style="font-weight: 600; margin-bottom: var(--spacing-sm);">Segment ${i + 1}: ${seg.fromPoint.name || 'Start'} → ${seg.toPoint.name || 'End'}</div>
        ${renderDelta(seg.delta, seg.fromPoint.temperature, seg.toPoint.temperature)}
      </div>`;
        });
    }

    showResultModal('Trip Loss', html);
}

function renderDelta(delta, fromTemp, toTemp) {
    const mc = delta.massKg >= 0 ? 'positive' : 'negative';
    const v15c = delta.v15 >= 0 ? 'positive' : 'negative';
    const vfc = delta.vFact >= 0 ? 'positive' : 'negative';

    let factLabel = 'Δ Volume (Fact. T)';
    if (fromTemp != null && toTemp != null) {
        factLabel = `Δ V (@ ${formatTemperature(fromTemp)}°C → ${formatTemperature(toTemp)}°C)`;
    }

    return `
    <div class="delta-row">
      <span class="delta-label">Δ Mass</span>
      <div class="delta-values">
        <span class="delta-main ${mc}">${formatMass(delta.massKg)} kg</span>
        <span class="delta-percent ${mc}">(${formatPercent(delta.massPercent)}%)</span>
      </div>
    </div>
    <hr class="result-divider">
    <div class="delta-row">
      <span class="delta-label">Δ Volume (15°C)</span>
      <div class="delta-values">
        <span class="delta-main ${v15c}">${formatVolume(delta.v15)} l</span>
        <span class="delta-percent ${v15c}">(${formatPercent(delta.v15Percent)}%)</span>
      </div>
    </div>
    <hr class="result-divider">
    <div class="delta-row">
      <span class="delta-label">${factLabel}</span>
      <div class="delta-values">
        <span class="delta-main ${vfc}">${formatVolume(delta.vFact)} l</span>
        <span class="delta-percent ${vfc}">(${formatPercent(delta.vFactPercent)}%)</span>
      </div>
    </div>
  `;
}
