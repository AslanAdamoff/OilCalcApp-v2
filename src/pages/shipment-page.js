/**
 * Shipment Page — Create and calculate logistics shipments
 * Wizard-style flow: Division → Product → Route → Measurements → Result
 */

import { divisions } from '../data/divisions.js';
import { products, getProduct, getAstmCategory } from '../data/products.js';
import { getAllRoutes, getRoute, getTransportLabel } from '../data/routes.js';
import { getLocation } from '../data/locations.js';
import { getSeason } from '../data/loss-thresholds.js';
import { createShipment, createMeasurement, completeShipment } from '../domain/shipment.js';
import { calculate } from '../domain/trip-loss-calculator.js';
import { createTripPoint, DensityMode } from '../domain/models.js';
import { evaluateLoss, getLossStatusDisplay, getOperationType } from '../domain/loss-evaluator.js';
import { massVacToAir, massAirToVac } from '../domain/density-corrector.js';
import { formatMass, formatVolume, formatDensity, formatTemperature, formatLossPercent } from '../domain/formatters.js';
import { ShipmentService } from '../services/shipment-service.js';
import { exportShipmentPDF } from '../services/pdf-export.js';
import { showError, showResultModal } from './shared.js';

let shipment = createShipment();

export function renderShipmentPage() {
    const page = document.createElement('div');
    page.className = 'page';
    page.innerHTML = `
        <h1 class="page-title">Shipment</h1>
        
        <!-- Division & Product -->
        <div class="card" id="shipmentMeta">
            <div class="card-title">Shipment Details</div>
            
            <div class="field-group">
                <label class="field-label">Division</label>
                <select class="field-input field-select" id="divisionSelect">
                    <option value="">Select division...</option>
                    ${divisions.map(d => `<option value="${d.code}">${d.code} — ${d.name}</option>`).join('')}
                </select>
            </div>
            
            <div class="field-group">
                <label class="field-label">Product</label>
                <select class="field-input field-select" id="productSelect">
                    <option value="">Select product...</option>
                    ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
            </div>
            
            <div class="field-group">
                <label class="field-label">Route</label>
                <select class="field-input field-select" id="routeSelect">
                    <option value="">Select route...</option>
                </select>
            </div>
            
            <div class="field-group">
                <label class="field-label">Batch / BL Number</label>
                <input type="text" class="field-input" id="batchInput" placeholder="e.g. BL-2026-001">
            </div>
            
            <div class="field-group">
                <label class="field-label">Date</label>
                <input type="date" class="field-input" id="dateInput" value="${new Date().toISOString().slice(0, 10)}">
            </div>
        </div>
        
        <!-- Loaded Measurement -->
        <div class="card" id="loadedCard">
            <div class="card-title">📦 Loaded (Point A)</div>
            ${renderMeasurementFields('loaded')}
        </div>
        
        <!-- Unloaded Measurement -->
        <div class="card" id="unloadedCard">
            <div class="card-title">📥 Unloaded (Point B)</div>
            ${renderMeasurementFields('unloaded')}
        </div>
        
        <!-- Calculate Button -->
        <button class="btn-primary" id="calcShipmentBtn" style="margin-top: var(--spacing-md);">
            Calculate Loss
        </button>
    `;

    // Setup event listeners
    setTimeout(() => {
        setupDivisionFilter(page);
        setupCalculateBtn(page);
    }, 0);

    return page;
}

function renderMeasurementFields(prefix) {
    return `
        <div class="field-group">
            <label class="field-label">Mass (KG)</label>
            <input type="text" inputmode="decimal" class="field-input" id="${prefix}Mass" placeholder="0.00">
        </div>
        
        <div class="field-group">
            <label class="field-label">Density (kg/l)</label>
            <input type="text" inputmode="decimal" class="field-input" id="${prefix}Density" placeholder="0.000">
        </div>
        
        <div class="field-group">
            <label class="field-label">Temperature (°C)</label>
            <input type="text" inputmode="decimal" class="field-input" id="${prefix}Temp" placeholder="15.0">
        </div>
        
        <div class="segmented" style="margin-top: var(--spacing-sm);">
            <input type="radio" name="${prefix}DensityMode" id="${prefix}At15" value="at15" checked>
            <label for="${prefix}At15">ρ at 15°C</label>
            <input type="radio" name="${prefix}DensityMode" id="${prefix}AtTemp" value="atTemperature">
            <label for="${prefix}AtTemp">ρ at T°C</label>
        </div>
    `;
}

function setupDivisionFilter(page) {
    const divSelect = page.querySelector('#divisionSelect');
    const routeSelect = page.querySelector('#routeSelect');

    divSelect.addEventListener('change', () => {
        const division = divSelect.value;
        const routes = division ? getAllRoutes().filter(r => r.division === division) : getAllRoutes();

        routeSelect.innerHTML = '<option value="">Select route...</option>' +
            routes.map(r => {
                const tl = getTransportLabel(r.transport);
                return `<option value="${r.id}">${tl.icon} ${r.name}</option>`;
            }).join('');
    });
}

function setupCalculateBtn(page) {
    page.querySelector('#calcShipmentBtn').addEventListener('click', () => {
        try {
            // Read inputs
            const division = page.querySelector('#divisionSelect').value;
            const product = page.querySelector('#productSelect').value;
            const routeId = page.querySelector('#routeSelect').value;
            const batch = page.querySelector('#batchInput').value;
            const date = page.querySelector('#dateInput').value;

            if (!division) { showError('Please select a division'); return; }
            if (!product) { showError('Please select a product'); return; }

            // Read measurements
            const loadedMass = parseFloat(page.querySelector('#loadedMass').value.replace(',', '.'));
            const loadedDensity = parseFloat(page.querySelector('#loadedDensity').value.replace(',', '.'));
            const loadedTemp = parseFloat(page.querySelector('#loadedTemp').value.replace(',', '.'));
            const loadedMode = page.querySelector(`input[name="loadedDensityMode"]:checked`)?.value || 'at15';

            const unloadedMass = parseFloat(page.querySelector('#unloadedMass').value.replace(',', '.'));
            const unloadedDensity = parseFloat(page.querySelector('#unloadedDensity').value.replace(',', '.'));
            const unloadedTemp = parseFloat(page.querySelector('#unloadedTemp').value.replace(',', '.'));
            const unloadedMode = page.querySelector(`input[name="unloadedDensityMode"]:checked`)?.value || 'at15';

            if (isNaN(loadedMass) || loadedMass <= 0) { showError('Enter valid loaded mass'); return; }
            if (isNaN(loadedDensity) || loadedDensity <= 0) { showError('Enter valid loaded density'); return; }
            if (isNaN(loadedTemp)) { showError('Enter valid loaded temperature'); return; }
            if (isNaN(unloadedMass) || unloadedMass <= 0) { showError('Enter valid unloaded mass'); return; }
            if (isNaN(unloadedDensity) || unloadedDensity <= 0) { showError('Enter valid unloaded density'); return; }
            if (isNaN(unloadedTemp)) { showError('Enter valid unloaded temperature'); return; }

            // Get route info
            const route = getRoute(routeId);
            const transportType = route?.transport || 'truck';

            // Build trip points (reuse existing calculator)
            const points = [
                createTripPoint({ name: 'Loaded', mass: String(loadedMass), density: String(loadedDensity), temperature: String(loadedTemp), densityMode: loadedMode === 'at15' ? DensityMode.AT_15 : DensityMode.AT_TEMPERATURE }),
                createTripPoint({ name: 'Unloaded', mass: String(unloadedMass), density: String(unloadedDensity), temperature: String(unloadedTemp), densityMode: unloadedMode === 'at15' ? DensityMode.AT_15 : DensityMode.AT_TEMPERATURE }),
            ];

            const astmCategory = getAstmCategory(product);
            const calcResult = calculate(points, astmCategory);

            // Evaluate loss
            const operation = getOperationType(transportType, false);
            const season = getSeason(new Date(date));
            const lossPercent = calcResult.deltaMassPercent;

            const evaluation = evaluateLoss({
                lossPercent,
                lossKg: calcResult.deltaMassKg,
                division,
                operation,
                product,
                season,
                level: 'perUnit',
            });

            // Create and save shipment
            shipment = createShipment({
                division, product, routeId, transportType,
                fromLocation: route?.from || '',
                toLocation: route?.to || '',
                batchNumber: batch,
                date: new Date(date).toISOString(),
            });

            shipment = completeShipment(shipment, calcResult, evaluation);
            ShipmentService.save(shipment);

            // Show result
            showShipmentResult(shipment, calcResult, evaluation);

        } catch (err) {
            showError(err.message || 'Calculation error');
        }
    });
}

function showShipmentResult(shipment, calcResult, evaluation) {
    const A = calcResult.points[0];
    const B = calcResult.points[calcResult.points.length - 1];
    const statusDisplay = getLossStatusDisplay(evaluation.status);
    const productInfo = getProduct(shipment.product);
    const route = getRoute(shipment.routeId);

    const html = `
        <!-- Status Banner -->
        <div class="result-card" style="text-align: center; border-color: ${statusDisplay.color}40;">
            <div style="font-size: 2.5rem; margin-bottom: var(--spacing-sm);">${statusDisplay.icon}</div>
            <div style="font-size: var(--font-lg); font-weight: 700; color: ${statusDisplay.color};">${statusDisplay.label}</div>
            <div style="font-size: var(--font-sm); color: var(--text-secondary); margin-top: var(--spacing-xs);">${evaluation.message}</div>
        </div>
        
        <!-- Loss Summary -->
        <div class="result-card">
            <div class="result-row">
                <span class="label">Division</span>
                <span class="value">${shipment.division}</span>
            </div>
            <div class="result-row">
                <span class="label">Product</span>
                <span class="value">${productInfo?.name || shipment.product}</span>
            </div>
            <div class="result-row">
                <span class="label">Route</span>
                <span class="value" style="font-size: var(--font-sm);">${route?.name || 'Custom'}</span>
            </div>
            ${shipment.batchNumber ? `<div class="result-row">
                <span class="label">Batch / BL</span>
                <span class="value">${shipment.batchNumber}</span>
            </div>` : ''}
            <hr class="result-divider">
            <div class="delta-row">
                <span class="delta-label">Mass Loss</span>
                <div class="delta-values">
                    <span class="delta-main ${calcResult.deltaMassKg < 0 ? 'negative' : 'positive'}">${formatMass(calcResult.deltaMassKg)} kg</span>
                    <span class="delta-percent ${calcResult.deltaMassPercent < 0 ? 'negative' : 'positive'}">${formatLossPercent(calcResult.deltaMassPercent)}</span>
                </div>
            </div>
            <div class="delta-row">
                <span class="delta-label">Volume @15°C Loss</span>
                <div class="delta-values">
                    <span class="delta-main ${calcResult.deltaV15 < 0 ? 'negative' : 'positive'}">${formatVolume(calcResult.deltaV15)} L</span>
                    <span class="delta-percent ${calcResult.deltaV15Percent < 0 ? 'negative' : 'positive'}">${formatLossPercent(calcResult.deltaV15Percent)}</span>
                </div>
            </div>
            <hr class="result-divider">
            <div class="result-row">
                <span class="label">Internal Limit</span>
                <span class="value">${evaluation.internalLimit !== null ? evaluation.internalLimit + '%' : 'N/A'}</span>
            </div>
            <div class="result-row">
                <span class="label">Contractual Limit</span>
                <span class="value">${evaluation.contractualLimit !== null ? evaluation.contractualLimit + '%' : 'N/A'}</span>
            </div>
        </div>
        
        <!-- Measurement Details -->
        <div class="result-card">
            <div style="font-weight: 700; margin-bottom: var(--spacing-sm);">Measurement Details</div>
            <div class="result-row">
                <span class="label"></span>
                <span class="value" style="font-size: var(--font-xs); color: var(--text-secondary);">Loaded → Unloaded</span>
            </div>
            <div class="result-row">
                <span class="label">Mass</span>
                <span class="value" style="font-size: var(--font-sm);">${formatMass(A.massKg)} → ${formatMass(B.massKg)} kg</span>
            </div>
            <div class="result-row">
                <span class="label">ρ @15°C</span>
                <span class="value" style="font-size: var(--font-sm);">${formatDensity(A.density15)} → ${formatDensity(B.density15)}</span>
            </div>
            <div class="result-row">
                <span class="label">Temp</span>
                <span class="value" style="font-size: var(--font-sm);">${formatTemperature(A.temperature)}°C → ${formatTemperature(B.temperature)}°C</span>
            </div>
            <div class="result-row">
                <span class="label">Vol @15°C</span>
                <span class="value" style="font-size: var(--font-sm);">${formatVolume(A.v15Liters)} → ${formatVolume(B.v15Liters)} L</span>
            </div>
        </div>
        
        <!-- Actions -->
        <button class="btn-secondary" id="exportPdfBtn" style="margin-top: var(--spacing-sm);">
            📄 Export PDF Report
        </button>
    `;

    showResultModal('Shipment Result', html);

    // PDF export button
    setTimeout(() => {
        const pdfBtn = document.querySelector('#exportPdfBtn');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', async () => {
                try {
                    const fileName = await exportShipmentPDF(shipment);
                    showError(`PDF saved: ${fileName}`); // reuse toast for success
                } catch (err) {
                    showError('PDF export failed: ' + err.message);
                }
            });
        }
    }, 100);
}
