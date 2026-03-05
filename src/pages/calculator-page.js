/**
 * Calculator Page — Port of MainCalcView.swift + MainCalcResultView.swift
 * Modes: Mass→Liters, Liters→Mass, Liters→Liters (volume temperature conversion)
 */

import { massToLitersDual, litersToMassDual, litersToLitersDual } from '../domain/calculator.js';
import { massVacToAir, massAirToVac } from '../domain/density-corrector.js';
import { validateDensity, validateTemperature, validateMass, ValidationError } from '../domain/validators.js';
import { formatMass, formatVolume, formatDensity, formatTemperature, formatPercent } from '../domain/formatters.js';
import { DensityMode, ProductType, CalculationType, createHistoryEntry } from '../domain/models.js';
import { products } from '../data/products.js';
import { HistoryService } from '../services/history-service.js';
import { showError, showResultModal } from './shared.js';
import { fieldIcons } from '../shared/icons.js';

const CALC_STATE_KEY = 'oilcalc_calculator_state';

const defaultState = {
  mode: 'direct',
  densityMode: DensityMode.AT_15,
  productType: ProductType.REFINED,
  density: '',
  temperature: '',
  mass: '',
  volume: '',
  productId: 'gas_oil',
  volConvDensity: '',
  tempFrom: '',
  tempTo: '',
  volConvVolume: '',
};

let state = loadState();

function saveState() {
  try { localStorage.setItem(CALC_STATE_KEY, JSON.stringify(state)); } catch (_) { }
}

function loadState() {
  try {
    const saved = localStorage.getItem(CALC_STATE_KEY);
    if (saved) return { ...defaultState, ...JSON.parse(saved) };
  } catch (_) { }
  return { ...defaultState };
}

/** Get typical density label for a product */
function getTypicalDensity(productId) {
  const p = products.find(pr => pr.id === productId);
  if (!p || !p.densityRange) return '0.840';
  const mid = ((p.densityRange[0] + p.densityRange[1]) / 2).toFixed(3);
  return mid;
}

export function renderCalculatorPage() {
  const page = document.createElement('div');
  page.className = 'page';

  const isVolConv = state.mode === 'volConv';
  const typicalDensity = getTypicalDensity(state.productId);

  page.innerHTML = `
    <h1 class="page-title">Calculator</h1>

    <!-- Mode Picker -->
    <div class="card">
      <div class="segmented segmented-3">
        <input type="radio" name="calcMode" id="modeDirect" value="direct" ${state.mode === 'direct' ? 'checked' : ''}>
        <label for="modeDirect">Mass → L</label>
        <input type="radio" name="calcMode" id="modeReverse" value="reverse" ${state.mode === 'reverse' ? 'checked' : ''}>
        <label for="modeReverse">L → Mass</label>
        <input type="radio" name="calcMode" id="modeVolConv" value="volConv" ${state.mode === 'volConv' ? 'checked' : ''}>
        <label for="modeVolConv">L → L</label>
      </div>
    </div>

    <!-- Data Card -->
    <div class="card">
      ${isVolConv ? renderVolConvFields(typicalDensity) : renderStandardFields()}
    </div>

    <!-- Calculate Button -->
    <button class="btn-primary" id="calcBtn">Calculate</button>
  `;

  // --- Event Listeners ---

  // Mode picker
  page.querySelectorAll('input[name="calcMode"]').forEach(r => {
    r.addEventListener('change', (e) => {
      state.mode = e.target.value;
      saveState();
      refreshPage();
    });
  });

  if (isVolConv) {
    setupVolConvListeners(page);
  } else {
    setupStandardListeners(page);
  }

  // Calculate button
  page.querySelector('#calcBtn').addEventListener('click', isVolConv ? calculateVolConv : calculate);

  return page;
}

// ── Standard mode fields (Mass↔Liters) ──────────────────────

function renderStandardFields() {
  return `
    <!-- Product Type -->
    <div class="segmented">
      <input type="radio" name="productType" id="ptRefined" value="refined" ${state.productType === 'refined' ? 'checked' : ''}>
      <label for="ptRefined">Refined Products</label>
      <input type="radio" name="productType" id="ptCrude" value="crude" ${state.productType === 'crude' ? 'checked' : ''}>
      <label for="ptCrude">Crude Oil</label>
    </div>

    <!-- Density Mode -->
    <div class="segmented" style="margin-top: var(--spacing-sm);">
      <input type="radio" name="densityMode" id="dmAt15" value="at15" ${state.densityMode === 'at15' ? 'checked' : ''}>
      <label for="dmAt15">Density at 15°C</label>
      <input type="radio" name="densityMode" id="dmAtT" value="atTemperature" ${state.densityMode === 'atTemperature' ? 'checked' : ''}>
      <label for="dmAtT">Density at T°C</label>
    </div>

    <!-- Density Input -->
    <div class="field-group">
      <div class="field-label">
        <span class="field-icon">${fieldIcons.density}</span>
        Density (kg/l)
      </div>
      <input type="text" inputmode="decimal" class="field-input" id="calcDensity" placeholder="0.850" value="${state.density}">
    </div>

    <!-- Temperature Input -->
    <div class="field-group">
      <div class="field-label">
        <span class="field-icon">${fieldIcons.temperature}</span>
        Temperature (°C)
      </div>
      <input type="text" inputmode="text" class="field-input" id="calcTemp" placeholder="20.0" value="${state.temperature}">
    </div>

    <!-- Mass or Volume Input -->
    <div class="field-group" id="mainInputGroup">
      ${state.mode === 'direct' ? `
        <div class="field-label">
          <span class="field-icon">${fieldIcons.mass}</span>
          Mass (kg)
        </div>
        <input type="text" inputmode="decimal" class="field-input" id="calcMainInput" placeholder="1000.0" value="${state.mass}">
      ` : `
        <div class="field-label">
          <span class="field-icon">${fieldIcons.volume}</span>
          Volume (l)
        </div>
        <input type="text" inputmode="decimal" class="field-input" id="calcMainInput" placeholder="1000.0" value="${state.volume}">
      `}
    </div>
  `;
}

// ── VolConv mode fields (Liters → Liters) ───────────────────

function renderVolConvFields(typicalDensity) {
  const productOptions = products.map(p => {
    const mid = ((p.densityRange[0] + p.densityRange[1]) / 2).toFixed(3);
    return `<option value="${p.id}" ${p.id === state.productId ? 'selected' : ''}>${p.name} (${mid})</option>`;
  }).join('');

  return `
    <!-- Product Selector -->
    <div class="field-group">
      <div class="field-label">
        <span class="field-icon">${fieldIcons.density}</span>
        Product
      </div>
      <select class="field-input" id="vcProduct">${productOptions}</select>
    </div>

    <!-- Density (optional) -->
    <div class="field-group">
      <div class="field-label">
        <span class="field-icon">${fieldIcons.density}</span>
        Density (kg/l) — <span class="text-muted">optional</span>
      </div>
      <input type="text" inputmode="decimal" class="field-input" id="vcDensity" placeholder="${typicalDensity} (${products.find(p => p.id === state.productId)?.name || 'default'})" value="${state.volConvDensity}">
    </div>

    <!-- Density Mode -->
    <div class="segmented" style="margin-top: var(--spacing-xs);">
      <input type="radio" name="vcDensityMode" id="vcDmAt15" value="at15" ${state.densityMode === 'at15' ? 'checked' : ''}>
      <label for="vcDmAt15">ρ at 15°C</label>
      <input type="radio" name="vcDensityMode" id="vcDmAtT" value="atTemperature" ${state.densityMode === 'atTemperature' ? 'checked' : ''}>
      <label for="vcDmAtT">ρ at T₁</label>
    </div>

    <!-- T₁ (source temp) -->
    <div class="field-group">
      <div class="field-label">
        <span class="field-icon">${fieldIcons.temperature}</span>
        T₁ — Source Temperature (°C)
      </div>
      <input type="text" inputmode="text" class="field-input" id="vcTempFrom" placeholder="25.0" value="${state.tempFrom}">
    </div>

    <!-- T₂ (target temp) -->
    <div class="field-group">
      <div class="field-label">
        <span class="field-icon">${fieldIcons.temperature}</span>
        T₂ — Target Temperature (°C)
      </div>
      <input type="text" inputmode="text" class="field-input" id="vcTempTo" placeholder="15.0" value="${state.tempTo}">
    </div>

    <!-- Volume at T₁ -->
    <div class="field-group">
      <div class="field-label">
        <span class="field-icon">${fieldIcons.volume}</span>
        Volume at T₁ (liters)
      </div>
      <input type="text" inputmode="decimal" class="field-input" id="vcVolume" placeholder="1000.0" value="${state.volConvVolume}">
    </div>
  `;
}

// ── Event setup ─────────────────────────────────────────────

function setupStandardListeners(page) {
  // Product type picker
  page.querySelectorAll('input[name="productType"]').forEach(r => {
    r.addEventListener('change', (e) => { state.productType = e.target.value; saveState(); });
  });

  // Density mode picker
  page.querySelectorAll('input[name="densityMode"]').forEach(r => {
    r.addEventListener('change', (e) => { state.densityMode = e.target.value; saveState(); });
  });

  // Input bindings
  const bindInput = (id, key, allowNegative = false) => {
    const el = page.querySelector(`#${id}`);
    if (el) {
      el.addEventListener('input', (e) => {
        let v = e.target.value.replace(',', '.');
        if (allowNegative) {
          v = v.replace(/[^0-9.\-]/g, '').replace(/(?!^)-/g, '');
        } else {
          v = v.replace(/[^0-9.]/g, '');
        }
        e.target.value = v;
        state[key] = v;
        saveState();
      });
    }
  };

  bindInput('calcDensity', 'density');
  bindInput('calcTemp', 'temperature', true);

  // Main input binding depends on mode
  const mainInput = page.querySelector('#calcMainInput');
  if (mainInput) {
    mainInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(',', '.');
      e.target.value = v;
      if (state.mode === 'direct') state.mass = v;
      else state.volume = v;
      saveState();
    });
  }
}

function setupVolConvListeners(page) {
  // Product selector
  const productSelect = page.querySelector('#vcProduct');
  if (productSelect) {
    productSelect.addEventListener('change', (e) => {
      state.productId = e.target.value;
      saveState();
      // Update density placeholder
      const densityInput = page.querySelector('#vcDensity');
      if (densityInput) {
        const p = products.find(pr => pr.id === state.productId);
        const mid = p ? ((p.densityRange[0] + p.densityRange[1]) / 2).toFixed(3) : '0.840';
        densityInput.placeholder = `${mid} (${p?.name || 'default'})`;
      }
    });
  }

  // Density mode
  page.querySelectorAll('input[name="vcDensityMode"]').forEach(r => {
    r.addEventListener('change', (e) => { state.densityMode = e.target.value; saveState(); });
  });

  // Input bindings
  const bindVC = (id, key, allowNegative = false) => {
    const el = page.querySelector(`#${id}`);
    if (el) {
      el.addEventListener('input', (e) => {
        let v = e.target.value.replace(',', '.');
        if (allowNegative) {
          v = v.replace(/[^0-9.\-]/g, '').replace(/(?!^)-/g, '');
        } else {
          v = v.replace(/[^0-9.]/g, '');
        }
        e.target.value = v;
        state[key] = v;
        saveState();
      });
    }
  };

  bindVC('vcDensity', 'volConvDensity');
  bindVC('vcTempFrom', 'tempFrom', true);
  bindVC('vcTempTo', 'tempTo', true);
  bindVC('vcVolume', 'volConvVolume');
}

// ── Page refresh ────────────────────────────────────────────

function refreshPage() {
  const container = document.querySelector('.page-container');
  if (container) {
    container.innerHTML = '';
    container.appendChild(renderCalculatorPage());
  }
}

// ── Standard calculation ────────────────────────────────────

function calculate() {
  try {
    const densityVal = validateDensity(state.density, 'Density (kg/l)');
    const tempVal = validateTemperature(state.temperature, 'Temperature (°C)');

    let result;
    let inputValue;

    if (state.mode === 'direct') {
      inputValue = validateMass(state.mass, 'Mass (kg)');
      result = massToLitersDual(inputValue, densityVal, tempVal, state.densityMode, state.productType);
    } else {
      inputValue = validateMass(state.volume, 'Volume (l)');
      result = litersToMassDual(inputValue, densityVal, tempVal, state.densityMode, state.productType);
    }

    // Save to history
    const entry = createHistoryEntry({
      type: CalculationType.MAIN_CALC,
      dualResult: result,
      parameters: {
        mode: state.mode === 'direct' ? 'massToLiters' : 'litersToMass',
        density: formatDensity(densityVal),
        temperature: formatTemperature(tempVal),
        densityMode: state.densityMode,
        productType: state.productType,
        input: state.mode === 'direct' ? formatMass(inputValue) : formatVolume(inputValue),
      },
    });
    HistoryService.addEntry(entry);

    // Show result
    showCalcResult(result, inputValue, tempVal);

  } catch (e) {
    showError(e.message);
  }
}

// ── Volume conversion calculation ───────────────────────────

function calculateVolConv() {
  try {
    const t1 = validateTemperature(state.tempFrom, 'T₁ — Source Temperature');
    const t2 = validateTemperature(state.tempTo, 'T₂ — Target Temperature');
    const vol = validateMass(state.volConvVolume, 'Volume at T₁');

    // Density is optional — parse if provided, else null
    let densityVal = null;
    if (state.volConvDensity.trim()) {
      densityVal = validateDensity(state.volConvDensity, 'Density (kg/l)');
    }

    const result = litersToLitersDual(vol, t1, t2, densityVal, state.densityMode, state.productId);

    // Save to history
    const prod = products.find(p => p.id === state.productId);
    const entry = createHistoryEntry({
      type: CalculationType.MAIN_CALC,
      parameters: {
        mode: 'litersToLiters',
        product: prod?.name || state.productId,
        density: densityVal !== null ? formatDensity(densityVal) : `auto (${getTypicalDensity(state.productId)})`,
        tempFrom: formatTemperature(t1),
        tempTo: formatTemperature(t2),
        volumeInput: formatVolume(vol),
        volumeAt15: formatVolume(result.v15),
        volumeTarget: formatVolume(result.vTarget),
      },
    });
    HistoryService.addEntry(entry);

    // Show result
    showVolConvResult(result);

  } catch (e) {
    showError(e.message);
  }
}

// ── Result modals ───────────────────────────────────────────

function showCalcResult(result, inputValue, temperature) {
  const isDirect = state.mode === 'direct';

  let rows = '';

  if (isDirect) {
    rows += resultRow('Mass (input)', formatMass(inputValue) + ' kg');
    rows += '<hr class="result-divider">';
    if (result.density15 !== null) {
      rows += resultRow('Density at 15°C', formatDensity(result.density15));
      rows += resultRow(`Density at ${formatTemperature(temperature)}°C`, formatDensity(result.densityT));
    }
    rows += '<hr class="result-divider">';
    rows += resultRow('Volume at 15°C', formatVolume(result.at15) + ' l', 'accent');
    rows += resultRow(`Volume at ${formatTemperature(temperature)}°C`, formatVolume(result.atT) + ' l', 'accent');
  } else {
    rows += resultRow('Volume (input)', formatVolume(inputValue) + ' l');
    rows += '<hr class="result-divider">';
    if (result.density15 !== null) {
      rows += resultRow('Density at 15°C', formatDensity(result.density15));
      rows += resultRow(`Density at ${formatTemperature(temperature)}°C`, formatDensity(result.densityT));
    }
    rows += '<hr class="result-divider">';
    rows += resultRow('Mass (at 15°C)', formatMass(result.at15) + ' kg', 'accent');
    rows += resultRow('Mass (at T°C)', formatMass(result.atT) + ' kg', 'accent');
  }

  // Difference
  const diff = result.difference;
  const unit = isDirect ? 'l' : 'kg';
  const fmtDiff = isDirect ? formatVolume(diff) : formatMass(diff);
  const diffClass = diff >= 0 ? 'positive' : 'negative';

  rows += '<hr class="result-divider">';
  rows += `
    <div class="result-row">
      <span class="label">Difference</span>
      <span class="value ${diffClass}">${fmtDiff} ${unit}</span>
    </div>
    <div class="result-row">
      <span class="label">Difference %</span>
      <span class="value ${diffClass}">${formatPercent(result.percentDifference)}%</span>
    </div>
  `;

  // ASTM Table 56 — Buoyancy Correction
  if (result.density15 !== null && result.density15 > 0) {
    const massForTable56 = isDirect ? inputValue : result.at15;
    const massVac = massForTable56;
    const massAir = massVacToAir(massVac, result.density15);
    const buoyancyDiff = massAir - massVac;

    rows += '<hr class="result-divider">';
    rows += resultRow('⚖️ Mass in Vacuum', formatMass(massVac) + ' kg');
    rows += resultRow('⚖️ Mass in Air', formatMass(massAir) + ' kg');
    rows += resultRow('Buoyancy Correction', formatMass(buoyancyDiff) + ' kg');
  }

  showResultModal('Calculator', `<div class="result-card">${rows}</div>`);
}

function showVolConvResult(result) {
  let rows = '';

  // Input
  rows += resultRow(`Volume at T₁ (${formatTemperature(result.tInput)}°C) — input`, formatVolume(result.vInput) + ' l');
  rows += '<hr class="result-divider">';

  // Densities
  rows += resultRow('ρ at 15°C', formatDensity(result.rho15));
  rows += resultRow(`ρ at T₁ (${formatTemperature(result.tInput)}°C)`, formatDensity(result.rhoTInput));
  rows += resultRow(`ρ at T₂ (${formatTemperature(result.tTarget)}°C)`, formatDensity(result.rhoTTarget));
  rows += '<hr class="result-divider">';

  // Volumes
  rows += resultRow('Volume at 15°C', formatVolume(result.v15) + ' l', 'accent');
  rows += resultRow(`Volume at T₂ (${formatTemperature(result.tTarget)}°C)`, formatVolume(result.vTarget) + ' l', 'accent');
  rows += '<hr class="result-divider">';

  // Difference T₁ vs 15°C
  const diffT1_15 = result.v15 - result.vInput;
  const diffT1_15Pct = result.vInput !== 0 ? (diffT1_15 / result.vInput) * 100 : 0;
  const diffT1_15Class = diffT1_15 >= 0 ? 'positive' : 'negative';

  rows += `
    <div class="result-row">
      <span class="label">Δ (15°C − T₁)</span>
      <span class="value ${diffT1_15Class}">${formatVolume(diffT1_15)} l</span>
    </div>
    <div class="result-row">
      <span class="label">Δ (15°C − T₁) %</span>
      <span class="value ${diffT1_15Class}">${formatPercent(diffT1_15Pct)}%</span>
    </div>
  `;
  rows += '<hr class="result-divider">';

  // Difference T₂ vs T₁
  const diff = result.difference;
  const diffClass = diff >= 0 ? 'positive' : 'negative';

  rows += `
    <div class="result-row">
      <span class="label">Δ (T₂ − T₁)</span>
      <span class="value ${diffClass}">${formatVolume(diff)} l</span>
    </div>
    <div class="result-row">
      <span class="label">Δ (T₂ − T₁) %</span>
      <span class="value ${diffClass}">${formatPercent(result.percentDifference)}%</span>
    </div>
  `;

  showResultModal('Volume Conversion', `<div class="result-card">${rows}</div>`);
}

function resultRow(label, value, cls = '') {
  return `<div class="result-row"><span class="label">${label}</span><span class="value ${cls}">${value}</span></div>`;
}
