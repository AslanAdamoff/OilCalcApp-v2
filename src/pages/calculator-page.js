/**
 * Calculator Page — Multi-mode petroleum calculator
 * Modes: Mass→L, L→Mass, L→L, Find ρ, VCF Table
 */

import { massToLitersDual, litersToMassDual, litersToLitersDual, reverseDensity } from '../domain/calculator.js';
import { massVacToAir, vcf, densityT } from '../domain/density-corrector.js';
import { validateDensity, validateTemperature, validateMass } from '../domain/validators.js';
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
  density: '', temperature: '', mass: '', volume: '',
  // volConv
  productId: 'gas_oil', volConvDensity: '', tempFrom: '', tempTo: '', volConvVolume: '',
  // reverseDensity
  rdMass: '', rdVolume: '', rdTemp: '', rdProductType: ProductType.REFINED,
  // vcfTable
  vcfDensity: '', vcfTempFrom: '-10', vcfTempTo: '40', vcfProductType: ProductType.REFINED,
};

let state = loadState();
function saveState() { try { localStorage.setItem(CALC_STATE_KEY, JSON.stringify(state)); } catch (_) { } }
function loadState() {
  try {
    const saved = localStorage.getItem(CALC_STATE_KEY);
    if (saved) return { ...defaultState, ...JSON.parse(saved) };
  } catch (_) { }
  return { ...defaultState };
}

function getTypicalDensity(productId) {
  const p = products.find(pr => pr.id === productId);
  if (!p || !p.densityRange) return '0.840';
  return ((p.densityRange[0] + p.densityRange[1]) / 2).toFixed(3);
}

// ── Mode definitions ────────────────────────────────────────
const modes = [
  { id: 'direct', label: 'Mass→L' },
  { id: 'reverse', label: 'L→Mass' },
  { id: 'volConv', label: 'L→L' },
  { id: 'findRho', label: 'Find ρ' },
  { id: 'vcfTable', label: 'VCF' },
];

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════

export function renderCalculatorPage() {
  const page = document.createElement('div');
  page.className = 'page';

  page.innerHTML = `
    <h1 class="page-title">Calculator</h1>

    <!-- Mode Picker (scrollable pill row) -->
    <div class="card">
      <div class="calc-mode-row">
        ${modes.map(m => `
          <button class="calc-mode-btn ${state.mode === m.id ? 'active' : ''}" data-mode="${m.id}">${m.label}</button>
        `).join('')}
      </div>
    </div>

    <!-- Input Card -->
    <div class="card" id="calcInputCard">
      ${renderInputFields()}
    </div>

    <!-- Action -->
    ${state.mode === 'vcfTable' ? '' : '<button class="btn-primary" id="calcBtn">Calculate</button>'}
  `;

  // Mode buttons
  page.querySelectorAll('.calc-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      saveState();
      refreshPage();
    });
  });

  // Input listeners
  setupInputListeners(page);

  // Calculate
  const calcBtn = page.querySelector('#calcBtn');
  if (calcBtn) calcBtn.addEventListener('click', handleCalculate);

  // VCF Table: auto-generate on render
  if (state.mode === 'vcfTable') {
    setTimeout(() => generateVCFTable(page), 0);
  }

  return page;
}

// ═══════════════════════════════════════════════════════════════
// INPUT FIELDS
// ═══════════════════════════════════════════════════════════════

function renderInputFields() {
  switch (state.mode) {
    case 'direct':
    case 'reverse':
      return renderStandardFields();
    case 'volConv':
      return renderVolConvFields();
    case 'findRho':
      return renderFindRhoFields();
    case 'vcfTable':
      return renderVCFTableFields();
    default:
      return '';
  }
}

function renderStandardFields() {
  return `
    <div class="segmented">
      <input type="radio" name="productType" id="ptRefined" value="refined" ${state.productType === 'refined' ? 'checked' : ''}>
      <label for="ptRefined">Refined Products</label>
      <input type="radio" name="productType" id="ptCrude" value="crude" ${state.productType === 'crude' ? 'checked' : ''}>
      <label for="ptCrude">Crude Oil</label>
    </div>
    <div class="segmented" style="margin-top: var(--spacing-sm);">
      <input type="radio" name="densityMode" id="dmAt15" value="at15" ${state.densityMode === 'at15' ? 'checked' : ''}>
      <label for="dmAt15">Density at 15°C</label>
      <input type="radio" name="densityMode" id="dmAtT" value="atTemperature" ${state.densityMode === 'atTemperature' ? 'checked' : ''}>
      <label for="dmAtT">Density at T°C</label>
    </div>
    <div class="field-group">
      <div class="field-label"><span class="field-icon">${fieldIcons.density}</span> Density (kg/l)</div>
      <input type="text" inputmode="decimal" class="field-input" id="calcDensity" placeholder="0.850" value="${state.density}">
    </div>
    <div class="field-group">
      <div class="field-label"><span class="field-icon">${fieldIcons.temperature}</span> Temperature (°C)</div>
      <input type="text" inputmode="text" class="field-input" id="calcTemp" placeholder="20.0" value="${state.temperature}">
    </div>
    <div class="field-group">
      ${state.mode === 'direct' ? `
        <div class="field-label"><span class="field-icon">${fieldIcons.mass}</span> Mass (kg)</div>
        <input type="text" inputmode="decimal" class="field-input" id="calcMainInput" placeholder="1000.0" value="${state.mass}">
      ` : `
        <div class="field-label"><span class="field-icon">${fieldIcons.volume}</span> Volume (l)</div>
        <input type="text" inputmode="decimal" class="field-input" id="calcMainInput" placeholder="1000.0" value="${state.volume}">
      `}
    </div>
  `;
}

function renderVolConvFields() {
  const typicalDensity = getTypicalDensity(state.productId);
  const prodName = products.find(p => p.id === state.productId)?.name || 'default';
  const productOptions = products.map(p => {
    const mid = ((p.densityRange[0] + p.densityRange[1]) / 2).toFixed(3);
    return `<option value="${p.id}" ${p.id === state.productId ? 'selected' : ''}>${p.name} (${mid})</option>`;
  }).join('');

  return `
    <div class="field-group" style="margin-top:0">
      <div class="field-label"><span class="field-icon">${fieldIcons.density}</span> Product</div>
      <select class="field-input" id="vcProduct">${productOptions}</select>
    </div>
    <div class="field-group">
      <div class="field-label"><span class="field-icon">${fieldIcons.density}</span> Density (kg/l) — <span class="text-muted">optional</span></div>
      <input type="text" inputmode="decimal" class="field-input" id="vcDensity" placeholder="${typicalDensity} (${prodName})" value="${state.volConvDensity}">
    </div>
    <div class="segmented" style="margin-top: var(--spacing-xs);">
      <input type="radio" name="vcDensityMode" id="vcDmAt15" value="at15" ${state.densityMode === 'at15' ? 'checked' : ''}>
      <label for="vcDmAt15">ρ at 15°C</label>
      <input type="radio" name="vcDensityMode" id="vcDmAtT" value="atTemperature" ${state.densityMode === 'atTemperature' ? 'checked' : ''}>
      <label for="vcDmAtT">ρ at T₁</label>
    </div>
    <div class="field-group">
      <div class="field-label"><span class="field-icon">${fieldIcons.temperature}</span> T₁ — Source Temperature (°C)</div>
      <input type="text" inputmode="text" class="field-input" id="vcTempFrom" placeholder="25.0" value="${state.tempFrom}">
    </div>
    <div class="field-group">
      <div class="field-label"><span class="field-icon">${fieldIcons.temperature}</span> T₂ — Target Temperature (°C)</div>
      <input type="text" inputmode="text" class="field-input" id="vcTempTo" placeholder="15.0" value="${state.tempTo}">
    </div>
    <div class="field-group">
      <div class="field-label"><span class="field-icon">${fieldIcons.volume}</span> Volume at T₁ (liters)</div>
      <input type="text" inputmode="decimal" class="field-input" id="vcVolume" placeholder="1000.0" value="${state.volConvVolume}">
    </div>
  `;
}

function renderFindRhoFields() {
  return `
    <div class="segmented">
      <input type="radio" name="rdProductType" id="rdRefined" value="refined" ${state.rdProductType === 'refined' ? 'checked' : ''}>
      <label for="rdRefined">Refined Products</label>
      <input type="radio" name="rdProductType" id="rdCrude" value="crude" ${state.rdProductType === 'crude' ? 'checked' : ''}>
      <label for="rdCrude">Crude Oil</label>
    </div>
    <div class="field-group">
      <div class="field-label"><span class="field-icon">${fieldIcons.temperature}</span> Temperature (°C)</div>
      <input type="text" inputmode="text" class="field-input" id="rdTemp" placeholder="20.0" value="${state.rdTemp}">
    </div>
    <div class="field-group">
      <div class="field-label"><span class="field-icon">${fieldIcons.mass}</span> Mass (kg)</div>
      <input type="text" inputmode="decimal" class="field-input" id="rdMass" placeholder="850.0" value="${state.rdMass}">
    </div>
    <div class="field-group">
      <div class="field-label"><span class="field-icon">${fieldIcons.volume}</span> Volume (l)</div>
      <input type="text" inputmode="decimal" class="field-input" id="rdVolume" placeholder="1000.0" value="${state.rdVolume}">
    </div>
  `;
}

function renderVCFTableFields() {
  return `
    <div class="segmented">
      <input type="radio" name="vcfProductType" id="vcfRefined" value="refined" ${state.vcfProductType === 'refined' ? 'checked' : ''}>
      <label for="vcfRefined">Refined</label>
      <input type="radio" name="vcfProductType" id="vcfCrude" value="crude" ${state.vcfProductType === 'crude' ? 'checked' : ''}>
      <label for="vcfCrude">Crude</label>
    </div>
    <div class="field-group">
      <div class="field-label"><span class="field-icon">${fieldIcons.density}</span> Density at 15°C (kg/l)</div>
      <input type="text" inputmode="decimal" class="field-input" id="vcfDensity" placeholder="0.845" value="${state.vcfDensity}">
    </div>
    <div style="display: flex; gap: var(--spacing-sm);">
      <div class="field-group" style="flex:1">
        <div class="field-label"><span class="field-icon">${fieldIcons.temperature}</span> T from (°C)</div>
        <input type="text" inputmode="text" class="field-input" id="vcfTempFrom" placeholder="-10" value="${state.vcfTempFrom}">
      </div>
      <div class="field-group" style="flex:1">
        <div class="field-label"><span class="field-icon">${fieldIcons.temperature}</span> T to (°C)</div>
        <input type="text" inputmode="text" class="field-input" id="vcfTempTo" placeholder="40" value="${state.vcfTempTo}">
      </div>
    </div>
    <button class="btn-primary" id="vcfGenerateBtn" style="margin-top: var(--spacing-md);">Generate Table</button>
    <div id="vcfTableContainer"></div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

function setupInputListeners(page) {
  const bind = (id, key, opts = {}) => {
    const el = page.querySelector(`#${id}`);
    if (!el) return;
    const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(eventType, (e) => {
      let v = e.target.value;
      if (el.tagName !== 'SELECT') {
        v = v.replace(',', '.');
        if (opts.allowNeg) {
          v = v.replace(/[^0-9.\-]/g, '').replace(/(?!^)-/g, '');
        } else if (!opts.raw) {
          v = v.replace(/[^0-9.]/g, '');
        }
        e.target.value = v;
      }
      state[key] = v;
      saveState();
      if (opts.onUpdate) opts.onUpdate(page);
    });
  };

  // Radio groups
  const bindRadio = (name, key) => {
    page.querySelectorAll(`input[name="${name}"]`).forEach(r => {
      r.addEventListener('change', (e) => { state[key] = e.target.value; saveState(); });
    });
  };

  switch (state.mode) {
    case 'direct':
    case 'reverse':
      bindRadio('productType', 'productType');
      bindRadio('densityMode', 'densityMode');
      bind('calcDensity', 'density');
      bind('calcTemp', 'temperature', { allowNeg: true });
      const mainInput = page.querySelector('#calcMainInput');
      if (mainInput) {
        mainInput.addEventListener('input', (e) => {
          let v = e.target.value.replace(',', '.');
          e.target.value = v;
          if (state.mode === 'direct') state.mass = v; else state.volume = v;
          saveState();
        });
      }
      break;

    case 'volConv':
      bind('vcProduct', 'productId', {
        onUpdate: (p) => {
          const dinp = p.querySelector('#vcDensity');
          if (dinp) {
            const prod = products.find(pr => pr.id === state.productId);
            const mid = prod ? ((prod.densityRange[0] + prod.densityRange[1]) / 2).toFixed(3) : '0.840';
            dinp.placeholder = `${mid} (${prod?.name || 'default'})`;
          }
        }
      });
      bindRadio('vcDensityMode', 'densityMode');
      bind('vcDensity', 'volConvDensity');
      bind('vcTempFrom', 'tempFrom', { allowNeg: true });
      bind('vcTempTo', 'tempTo', { allowNeg: true });
      bind('vcVolume', 'volConvVolume');
      break;

    case 'findRho':
      bindRadio('rdProductType', 'rdProductType');
      bind('rdTemp', 'rdTemp', { allowNeg: true });
      bind('rdMass', 'rdMass');
      bind('rdVolume', 'rdVolume');
      break;

    case 'vcfTable':
      bindRadio('vcfProductType', 'vcfProductType');
      bind('vcfDensity', 'vcfDensity');
      bind('vcfTempFrom', 'vcfTempFrom', { allowNeg: true });
      bind('vcfTempTo', 'vcfTempTo', { allowNeg: true });
      page.querySelector('#vcfGenerateBtn')?.addEventListener('click', () => generateVCFTable(page));
      break;
  }
}

function refreshPage() {
  const container = document.querySelector('.page-container');
  if (container) { container.innerHTML = ''; container.appendChild(renderCalculatorPage()); }
}

// ═══════════════════════════════════════════════════════════════
// CALCULATIONS
// ═══════════════════════════════════════════════════════════════

function handleCalculate() {
  switch (state.mode) {
    case 'direct':
    case 'reverse': return calculateStandard();
    case 'volConv': return calculateVolConv();
    case 'findRho': return calculateReverseDensity();
  }
}

function calculateStandard() {
  try {
    const densityVal = validateDensity(state.density, 'Density (kg/l)');
    const tempVal = validateTemperature(state.temperature, 'Temperature (°C)');
    let result, inputValue;

    if (state.mode === 'direct') {
      inputValue = validateMass(state.mass, 'Mass (kg)');
      result = massToLitersDual(inputValue, densityVal, tempVal, state.densityMode, state.productType);
    } else {
      inputValue = validateMass(state.volume, 'Volume (l)');
      result = litersToMassDual(inputValue, densityVal, tempVal, state.densityMode, state.productType);
    }

    const entry = createHistoryEntry({
      type: CalculationType.MAIN_CALC,
      dualResult: result,
      parameters: {
        mode: state.mode === 'direct' ? 'massToLiters' : 'litersToMass',
        density: formatDensity(densityVal), temperature: formatTemperature(tempVal),
        densityMode: state.densityMode, productType: state.productType,
        input: state.mode === 'direct' ? formatMass(inputValue) : formatVolume(inputValue),
      },
    });
    HistoryService.addEntry(entry);
    showStdResult(result, inputValue, tempVal);
  } catch (e) { showError(e.message); }
}

function calculateVolConv() {
  try {
    const t1 = validateTemperature(state.tempFrom, 'T₁');
    const t2 = validateTemperature(state.tempTo, 'T₂');
    const vol = validateMass(state.volConvVolume, 'Volume at T₁');
    let densityVal = null;
    if (state.volConvDensity.trim()) densityVal = validateDensity(state.volConvDensity, 'Density');

    const result = litersToLitersDual(vol, t1, t2, densityVal, state.densityMode, state.productId);
    const prod = products.find(p => p.id === state.productId);
    const entry = createHistoryEntry({
      type: CalculationType.MAIN_CALC,
      parameters: {
        mode: 'litersToLiters', product: prod?.name || state.productId,
        density: densityVal !== null ? formatDensity(densityVal) : `auto (${getTypicalDensity(state.productId)})`,
        tempFrom: formatTemperature(t1), tempTo: formatTemperature(t2),
        volumeInput: formatVolume(vol), volumeAt15: formatVolume(result.v15), volumeTarget: formatVolume(result.vTarget),
      },
    });
    HistoryService.addEntry(entry);
    showVolConvResult(result);
  } catch (e) { showError(e.message); }
}

function calculateReverseDensity() {
  try {
    const temp = validateTemperature(state.rdTemp, 'Temperature');
    const mass = validateMass(state.rdMass, 'Mass (kg)');
    const vol = validateMass(state.rdVolume, 'Volume (l)');

    const result = reverseDensity(mass, vol, temp, state.rdProductType);

    const entry = createHistoryEntry({
      type: CalculationType.MAIN_CALC,
      parameters: {
        mode: 'reverseDensity', temperature: formatTemperature(temp),
        mass: formatMass(mass), volume: formatVolume(vol),
        rhoT: formatDensity(result.rhoT), rho15: formatDensity(result.rho15),
      },
    });
    HistoryService.addEntry(entry);
    showReverseDensityResult(result, temp);
  } catch (e) { showError(e.message); }
}

function generateVCFTable(page) {
  const container = page.querySelector('#vcfTableContainer');
  if (!container) return;

  const d15Str = state.vcfDensity.trim();
  if (!d15Str) { showError('Enter density at 15°C'); return; }
  const d15 = parseFloat(d15Str);
  if (isNaN(d15) || d15 < 0.5 || d15 > 1.1) { showError('Density must be 0.500 – 1.100 kg/l'); return; }

  let tFrom = parseInt(state.vcfTempFrom) || -10;
  let tTo = parseInt(state.vcfTempTo) || 40;
  if (tFrom > tTo) [tFrom, tTo] = [tTo, tFrom];
  if (tTo - tFrom > 100) tTo = tFrom + 100;

  let rows = '';
  for (let t = tFrom; t <= tTo; t++) {
    const v = vcf(d15, t, state.vcfProductType);
    const dT = densityT(d15, t, state.vcfProductType);
    const isRef = (t === 15);
    rows += `<tr${isRef ? ' class="highlight"' : ''}>
      <td>${t}°C</td>
      <td>${v.toFixed(5)}</td>
      <td>${dT.toFixed(4)}</td>
    </tr>`;
  }

  container.innerHTML = `
    <div class="vcf-table-wrap">
      <table class="vcf-table">
        <thead><tr><th>T (°C)</th><th>VCF</th><th>ρ_T (kg/l)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="text-align:center; font-size: var(--font-xs); color: var(--text-muted); margin-top: var(--spacing-xs);">
      ASTM Table 54 · ρ₁₅ = ${formatDensity(d15)} kg/l · ${state.vcfProductType === 'crude' ? 'Crude' : 'Refined'}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// RESULT MODALS
// ═══════════════════════════════════════════════════════════════

function showStdResult(result, inputValue, temperature) {
  const isDirect = state.mode === 'direct';
  let rows = '';

  if (isDirect) {
    rows += rr('Mass (input)', formatMass(inputValue) + ' kg');
    rows += '<hr class="result-divider">';
    if (result.density15 !== null) {
      rows += rr('Density at 15°C', formatDensity(result.density15));
      rows += rr(`Density at ${formatTemperature(temperature)}°C`, formatDensity(result.densityT));
    }
    rows += '<hr class="result-divider">';
    rows += rr('Volume at 15°C', formatVolume(result.at15) + ' l', 'accent');
    rows += rr(`Volume at ${formatTemperature(temperature)}°C`, formatVolume(result.atT) + ' l', 'accent');
  } else {
    rows += rr('Volume (input)', formatVolume(inputValue) + ' l');
    rows += '<hr class="result-divider">';
    if (result.density15 !== null) {
      rows += rr('Density at 15°C', formatDensity(result.density15));
      rows += rr(`Density at ${formatTemperature(temperature)}°C`, formatDensity(result.densityT));
    }
    rows += '<hr class="result-divider">';
    rows += rr('Mass (at 15°C)', formatMass(result.at15) + ' kg', 'accent');
    rows += rr('Mass (at T°C)', formatMass(result.atT) + ' kg', 'accent');
  }

  // Difference
  const diff = result.difference;
  const unit = isDirect ? 'l' : 'kg';
  const fmtDiff = isDirect ? formatVolume(diff) : formatMass(diff);
  const dc = diff >= 0 ? 'positive' : 'negative';
  rows += '<hr class="result-divider">';
  rows += `<div class="result-row"><span class="label">Difference</span><span class="value ${dc}">${fmtDiff} ${unit}</span></div>`;
  rows += `<div class="result-row"><span class="label">Difference %</span><span class="value ${dc}">${formatPercent(result.percentDifference)}%</span></div>`;

  // ASTM Table 56
  if (result.density15 !== null && result.density15 > 0) {
    const massVal = isDirect ? inputValue : result.at15;
    const massAir = massVacToAir(massVal, result.density15);
    rows += '<hr class="result-divider">';
    rows += rr('⚖️ Mass in Vacuum', formatMass(massVal) + ' kg');
    rows += rr('⚖️ Mass in Air', formatMass(massAir) + ' kg');
    rows += rr('Buoyancy Correction', formatMass(massAir - massVal) + ' kg');
  }

  showResultModal('Calculator', `<div class="result-card">${rows}</div>`);
}

function showVolConvResult(result) {
  let rows = '';
  rows += rr(`Volume at T₁ (${formatTemperature(result.tInput)}°C) — input`, formatVolume(result.vInput) + ' l');
  rows += '<hr class="result-divider">';
  rows += rr('ρ at 15°C', formatDensity(result.rho15));
  rows += rr(`ρ at T₁ (${formatTemperature(result.tInput)}°C)`, formatDensity(result.rhoTInput));
  rows += rr(`ρ at T₂ (${formatTemperature(result.tTarget)}°C)`, formatDensity(result.rhoTTarget));
  rows += '<hr class="result-divider">';
  rows += rr('Volume at 15°C', formatVolume(result.v15) + ' l', 'accent');
  rows += rr(`Volume at T₂ (${formatTemperature(result.tTarget)}°C)`, formatVolume(result.vTarget) + ' l', 'accent');
  rows += '<hr class="result-divider">';

  // Δ 15°C − T₁
  const d1 = result.v15 - result.vInput;
  const d1p = result.vInput !== 0 ? (d1 / result.vInput) * 100 : 0;
  const dc1 = d1 >= 0 ? 'positive' : 'negative';
  rows += `<div class="result-row"><span class="label">Δ (15°C − T₁)</span><span class="value ${dc1}">${formatVolume(d1)} l</span></div>`;
  rows += `<div class="result-row"><span class="label">Δ (15°C − T₁) %</span><span class="value ${dc1}">${formatPercent(d1p)}%</span></div>`;
  rows += '<hr class="result-divider">';

  // Δ T₂ − T₁
  const d2 = result.difference;
  const dc2 = d2 >= 0 ? 'positive' : 'negative';
  rows += `<div class="result-row"><span class="label">Δ (T₂ − T₁)</span><span class="value ${dc2}">${formatVolume(d2)} l</span></div>`;
  rows += `<div class="result-row"><span class="label">Δ (T₂ − T₁) %</span><span class="value ${dc2}">${formatPercent(result.percentDifference)}%</span></div>`;

  showResultModal('Volume Conversion', `<div class="result-card">${rows}</div>`);
}

function showReverseDensityResult(result, temperature) {
  let rows = '';
  rows += rr('Temperature', formatTemperature(temperature) + '°C');
  rows += '<hr class="result-divider">';
  rows += rr(`Density at ${formatTemperature(temperature)}°C`, formatDensity(result.rhoT) + ' kg/l', 'accent');
  rows += rr('Density at 15°C', formatDensity(result.rho15) + ' kg/l', 'accent');
  showResultModal('Reverse Density', `<div class="result-card">${rows}</div>`);
}

function rr(label, value, cls = '') {
  return `<div class="result-row"><span class="label">${label}</span><span class="value ${cls}">${value}</span></div>`;
}
