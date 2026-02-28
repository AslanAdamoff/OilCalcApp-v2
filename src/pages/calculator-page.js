/**
 * Calculator Page — Port of MainCalcView.swift + MainCalcResultView.swift
 */

import { massToLitersDual, litersToMassDual } from '../domain/calculator.js';
import { validateDensity, validateTemperature, validateMass, ValidationError } from '../domain/validators.js';
import { formatMass, formatVolume, formatDensity, formatTemperature, formatPercent } from '../domain/formatters.js';
import { DensityMode, ProductType, CalculationType, createHistoryEntry } from '../domain/models.js';
import { HistoryService } from '../services/history-service.js';
import { showError, showResultModal } from './shared.js';
import { fieldIcons } from '../shared/icons.js';

let state = {
  mode: 'direct',       // 'direct' = Mass→Liters, 'reverse' = Liters→Mass
  densityMode: DensityMode.AT_15,
  productType: ProductType.REFINED,
  density: '',
  temperature: '',
  mass: '',
  volume: '',
};

export function renderCalculatorPage() {
  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <h1 class="page-title">Calculator</h1>

    <!-- Mode Picker -->
    <div class="card">
      <div class="segmented">
        <input type="radio" name="calcMode" id="modeDirect" value="direct" ${state.mode === 'direct' ? 'checked' : ''}>
        <label for="modeDirect">Mass → Liters</label>
        <input type="radio" name="calcMode" id="modeReverse" value="reverse" ${state.mode === 'reverse' ? 'checked' : ''}>
        <label for="modeReverse">Liters → Mass</label>
      </div>
    </div>

    <!-- Data Card -->
    <div class="card">
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
        <input type="text" inputmode="decimal" class="field-input" id="calcTemp" placeholder="20.0" value="${state.temperature}">
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
    </div>

    <!-- Calculate Button -->
    <button class="btn-primary" id="calcBtn">Calculate</button>
  `;

  // --- Event Listeners ---

  // Mode picker
  page.querySelectorAll('input[name="calcMode"]').forEach(r => {
    r.addEventListener('change', (e) => {
      state.mode = e.target.value;
      refreshPage();
    });
  });

  // Product type picker
  page.querySelectorAll('input[name="productType"]').forEach(r => {
    r.addEventListener('change', (e) => {
      state.productType = e.target.value;
    });
  });

  // Density mode picker
  page.querySelectorAll('input[name="densityMode"]').forEach(r => {
    r.addEventListener('change', (e) => {
      state.densityMode = e.target.value;
    });
  });

  // Input bindings (save to state on input change)
  const bindInput = (id, key) => {
    const el = page.querySelector(`#${id}`);
    if (el) {
      el.addEventListener('input', (e) => {
        let v = e.target.value.replace(',', '.');
        e.target.value = v;
        state[key] = v;
      });
    }
  };

  bindInput('calcDensity', 'density');
  bindInput('calcTemp', 'temperature');

  // Main input binding depends on mode
  const mainInput = page.querySelector('#calcMainInput');
  if (mainInput) {
    mainInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(',', '.');
      e.target.value = v;
      if (state.mode === 'direct') state.mass = v;
      else state.volume = v;
    });
  }

  // Calculate button
  page.querySelector('#calcBtn').addEventListener('click', calculate);

  return page;
}

function refreshPage() {
  const container = document.querySelector('.page-container');
  if (container) {
    container.innerHTML = '';
    container.appendChild(renderCalculatorPage());
  }
}

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

  showResultModal('Calculator', `<div class="result-card">${rows}</div>`);
}

function resultRow(label, value, cls = '') {
  return `<div class="result-row"><span class="label">${label}</span><span class="value ${cls}">${value}</span></div>`;
}
