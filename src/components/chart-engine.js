/**
 * Chart Engine — Lightweight SVG chart components
 * Zero dependencies, dark/light theme aware, responsive
 */

const COLORS = {
    primary: '#ff8c00',
    green: '#34d399',
    yellow: '#f59e0b',
    red: '#f87171',
    blue: '#60a5fa',
    purple: '#a78bfa',
    cyan: '#22d3ee',
    pink: '#f472b6',
    teal: '#2dd4bf',
    indigo: '#818cf8',
};

const PALETTE = [COLORS.blue, COLORS.primary, COLORS.green, COLORS.purple, COLORS.cyan, COLORS.pink, COLORS.teal, COLORS.red, COLORS.yellow, COLORS.indigo];

function isLight() {
    return document.documentElement.getAttribute('data-theme') === 'light';
}

function getTextColor() { return isLight() ? '#1a1d2e' : '#f0f2f8'; }
function getSubTextColor() { return isLight() ? '#5a6480' : '#9ca3b8'; }
function getMutedColor() { return isLight() ? '#8892a8' : '#5e6680'; }
function getGridColor() { return isLight() ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'; }

/**
 * Line Chart — Monthly trend
 * @param {HTMLElement} container
 * @param {Array} data - [{ label, value, value2? }]
 * @param {Object} options - { height, valueLabel, value2Label, suffix }
 */
export function renderLineChart(container, data, options = {}) {
    const { height = 220, valueKey = 'avgLoss', suffix = '%', title = '' } = options;
    if (!data || data.length === 0) { container.innerHTML = '<div class="chart-empty">No data</div>'; return; }

    const W = container.clientWidth || 400;
    const H = height;
    const pad = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const values = data.map(d => d[valueKey] || 0);
    const maxVal = Math.max(...values, 0.001);
    const minVal = 0;
    const range = maxVal - minVal || 1;

    const xStep = chartW / Math.max(data.length - 1, 1);

    const points = data.map((d, i) => ({
        x: pad.left + i * xStep,
        y: pad.top + chartH - ((d[valueKey] || 0) - minVal) / range * chartH,
        label: d.label,
        value: d[valueKey] || 0,
    }));

    // Build path
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = linePath + ` L${points[points.length - 1].x.toFixed(1)},${pad.top + chartH} L${points[0].x.toFixed(1)},${pad.top + chartH} Z`;

    // Grid lines (5 horizontal)
    const gridLines = [];
    const gridLabels = [];
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (chartH / 4) * i;
        const val = maxVal - (range / 4) * i;
        gridLines.push(`<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="${getGridColor()}" stroke-dasharray="4,4"/>`);
        gridLabels.push(`<text x="${pad.left - 8}" y="${y + 4}" fill="${getMutedColor()}" font-size="11" text-anchor="end" font-family="var(--font-family)">${val.toFixed(val < 1 ? 3 : 1)}${suffix}</text>`);
    }

    // X labels
    const xLabels = data.map((d, i) => {
        const showLabel = data.length <= 12 || i % Math.ceil(data.length / 8) === 0;
        return showLabel ? `<text x="${pad.left + i * xStep}" y="${H - 6}" fill="${getMutedColor()}" font-size="10" text-anchor="middle" font-family="var(--font-family)">${d.label}</text>` : '';
    });

    // Dots
    const dots = points.map((p, i) => `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${COLORS.primary}" stroke="rgba(0,0,0,0.3)" stroke-width="1" class="chart-dot" data-idx="${i}"/>
    `);

    // Tooltip areas
    const hoverAreas = points.map((p, i) => `
        <rect x="${p.x - xStep / 2}" y="${pad.top}" width="${xStep}" height="${chartH}" fill="transparent" class="chart-hover" data-idx="${i}"/>
    `);

    const gradientId = `lineGrad_${Date.now()}`;

    container.innerHTML = `
        <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${COLORS.primary}" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="${COLORS.primary}" stop-opacity="0.02"/>
                </linearGradient>
            </defs>
            ${gridLines.join('')}
            ${gridLabels.join('')}
            ${xLabels.join('')}
            <path d="${areaPath}" fill="url(#${gradientId})"/>
            <path d="${linePath}" fill="none" stroke="${COLORS.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <animate attributeName="stroke-dashoffset" from="${chartW * 3}" to="0" dur="1.2s" fill="freeze"/>
                <animate attributeName="stroke-dasharray" from="${chartW * 3}" to="${chartW * 3}" dur="1.2s" fill="freeze"/>
            </path>
            ${dots.join('')}
            ${hoverAreas.join('')}
        </svg>
        <div class="chart-tooltip" id="chartTooltip_${gradientId}" style="display:none;"></div>
    `;

    // Tooltip handlers
    const tooltip = container.querySelector(`#chartTooltip_${gradientId}`);
    container.querySelectorAll('.chart-hover').forEach(area => {
        area.addEventListener('mouseenter', (e) => {
            const idx = parseInt(area.dataset.idx);
            const p = points[idx];
            const d = data[idx];
            tooltip.innerHTML = `<strong>${d.label}</strong><br/>${(d[valueKey] || 0).toFixed(3)}${suffix}<br/>${d.count || 0} ops`;
            tooltip.style.display = 'block';
            tooltip.style.left = `${p.x}px`;
            tooltip.style.top = `${p.y - 60}px`;

            // Highlight dot
            const dot = container.querySelector(`.chart-dot[data-idx="${idx}"]`);
            if (dot) { dot.setAttribute('r', '6'); dot.setAttribute('fill', '#fff'); }
        });
        area.addEventListener('mouseleave', (e) => {
            tooltip.style.display = 'none';
            const idx = parseInt(area.dataset.idx);
            const dot = container.querySelector(`.chart-dot[data-idx="${idx}"]`);
            if (dot) { dot.setAttribute('r', '4'); dot.setAttribute('fill', COLORS.primary); }
        });
    });
}

/**
 * Bar Chart — Division/product comparison
 * @param {HTMLElement} container
 * @param {Array} data - [{ label, value, color? }]
 * @param {Object} options
 */
export function renderBarChart(container, data, options = {}) {
    const { height = 220, suffix = '', horizontal = false, showValues = true } = options;
    if (!data || data.length === 0) { container.innerHTML = '<div class="chart-empty">No data</div>'; return; }

    const W = container.clientWidth || 400;
    const H = height;
    const pad = { top: 20, right: 20, bottom: 40, left: horizontal ? 70 : 40 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const maxVal = Math.max(...data.map(d => d.value), 1);

    if (horizontal) {
        const barH = Math.min(28, chartH / data.length - 4);
        const gap = (chartH - barH * data.length) / Math.max(data.length - 1, 1);

        const bars = data.map((d, i) => {
            const y = pad.top + i * (barH + gap);
            const w = (d.value / maxVal) * chartW;
            const color = d.color || PALETTE[i % PALETTE.length];
            return `
                <rect x="${pad.left}" y="${y}" width="${w}" height="${barH}" rx="4" fill="${color}" opacity="0.85">
                    <animate attributeName="width" from="0" to="${w}" dur="0.6s" fill="freeze"/>
                </rect>
                <text x="${pad.left - 6}" y="${y + barH / 2 + 4}" fill="${getSubTextColor()}" font-size="11" text-anchor="end" font-family="var(--font-family)">${d.label}</text>
                ${showValues ? `<text x="${pad.left + w + 6}" y="${y + barH / 2 + 4}" fill="${getTextColor()}" font-size="11" font-weight="600" font-family="var(--font-family)">${d.value}${suffix}</text>` : ''}
            `;
        });

        container.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${bars.join('')}</svg>`;
    } else {
        const barW = Math.min(40, chartW / data.length - 8);
        const gap = (chartW - barW * data.length) / (data.length + 1);

        // Grid
        const gridLines = [];
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (chartH / 4) * i;
            gridLines.push(`<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="${getGridColor()}" stroke-dasharray="4,4"/>`);
        }

        const bars = data.map((d, i) => {
            const x = pad.left + gap + i * (barW + gap);
            const h = (d.value / maxVal) * chartH;
            const y = pad.top + chartH - h;
            const color = d.color || PALETTE[i % PALETTE.length];
            return `
                <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="4" fill="${color}" opacity="0.85">
                    <animate attributeName="height" from="0" to="${h}" dur="0.6s" fill="freeze"/>
                    <animate attributeName="y" from="${pad.top + chartH}" to="${y}" dur="0.6s" fill="freeze"/>
                </rect>
                <text x="${x + barW / 2}" y="${H - 8}" fill="${getMutedColor()}" font-size="10" text-anchor="middle" font-family="var(--font-family)">${d.label}</text>
                ${showValues ? `<text x="${x + barW / 2}" y="${y - 6}" fill="${getTextColor()}" font-size="11" font-weight="600" text-anchor="middle" font-family="var(--font-family)">${d.value}${suffix}</text>` : ''}
            `;
        });

        container.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${gridLines.join('')}${bars.join('')}</svg>`;
    }
}

/**
 * Donut Chart — Product/status breakdown
 * @param {HTMLElement} container
 * @param {Array} data - [{ label, value, color? }]
 * @param {Object} options
 */
export function renderDonutChart(container, data, options = {}) {
    const { size = 200, thickness = 30, centerLabel = '', centerValue = '' } = options;
    if (!data || data.length === 0) { container.innerHTML = '<div class="chart-empty">No data</div>'; return; }

    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) { container.innerHTML = '<div class="chart-empty">No data</div>'; return; }

    const cx = size / 2;
    const cy = size / 2;
    const r = (size - thickness) / 2 - 10;
    const circumference = 2 * Math.PI * r;

    let offset = 0;
    const arcs = data.map((d, i) => {
        const pct = d.value / total;
        const dashLen = circumference * pct;
        const dashOffset = circumference - offset;
        const color = d.color || PALETTE[i % PALETTE.length];
        const arc = `
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" 
                stroke="${color}" stroke-width="${thickness}" 
                stroke-dasharray="${dashLen} ${circumference - dashLen}" 
                stroke-dashoffset="${dashOffset}"
                stroke-linecap="round"
                transform="rotate(-90 ${cx} ${cy})"
                opacity="0.85">
                <animate attributeName="stroke-dasharray" from="0 ${circumference}" to="${dashLen} ${circumference - dashLen}" dur="0.8s" fill="freeze"/>
            </circle>
        `;
        offset += dashLen;
        return arc;
    });

    // Legend
    const legend = data.map((d, i) => {
        const pct = ((d.value / total) * 100).toFixed(1);
        const color = d.color || PALETTE[i % PALETTE.length];
        return `
            <div class="donut-legend-item">
                <span class="donut-legend-dot" style="background:${color}"></span>
                <span class="donut-legend-label">${d.label}</span>
                <span class="donut-legend-value">${d.value} (${pct}%)</span>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="donut-wrapper">
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                ${arcs.join('')}
                ${centerLabel ? `
                    <text x="${cx}" y="${cy - 8}" fill="${getTextColor()}" font-size="22" font-weight="800" text-anchor="middle" font-family="var(--font-family)">${centerValue}</text>
                    <text x="${cx}" y="${cy + 14}" fill="${getSubTextColor()}" font-size="11" text-anchor="middle" font-family="var(--font-family)">${centerLabel}</text>
                ` : ''}
            </svg>
            <div class="donut-legend">${legend}</div>
        </div>
    `;
}

/**
 * Stacked Bar Chart — Status breakdown by category
 */
export function renderStackedBarChart(container, data, options = {}) {
    const { height = 220, categories = ['withinNorm', 'warning', 'critical'] } = options;
    if (!data || data.length === 0) { container.innerHTML = '<div class="chart-empty">No data</div>'; return; }

    const W = container.clientWidth || 400;
    const H = height;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const catColors = { withinNorm: COLORS.green, warning: COLORS.yellow, critical: COLORS.red };
    const maxVal = Math.max(...data.map(d => categories.reduce((s, c) => s + (d[c] || 0), 0)), 1);

    const barW = Math.min(36, chartW / data.length - 6);
    const gap = (chartW - barW * data.length) / (data.length + 1);

    const bars = data.map((d, i) => {
        const x = pad.left + gap + i * (barW + gap);
        let yOffset = 0;

        const segments = categories.map(cat => {
            const val = d[cat] || 0;
            const h = (val / maxVal) * chartH;
            const y = pad.top + chartH - yOffset - h;
            yOffset += h;
            return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="2" fill="${catColors[cat]}" opacity="0.8"/>`;
        });

        return segments.join('') + `<text x="${x + barW / 2}" y="${H - 8}" fill="${getMutedColor()}" font-size="10" text-anchor="middle" font-family="var(--font-family)">${d.label || d.code}</text>`;
    });

    container.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${bars.join('')}</svg>`;
}

/**
 * Grouped Bar Chart — Paired bars for period comparison
 * @param {HTMLElement} container
 * @param {Array} data - [{ label, current, previous }]
 * @param {Object} options - { height, suffix, currentLabel, previousLabel }
 */
export function renderGroupedBarChart(container, data, options = {}) {
    const { height = 220, suffix = '%', currentLabel = 'Current', previousLabel = 'Previous' } = options;
    if (!data || data.length === 0) { container.innerHTML = '<div class="chart-empty">No data</div>'; return; }

    const W = container.clientWidth || 400;
    const H = height;
    const pad = { top: 30, right: 20, bottom: 40, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const maxVal = Math.max(...data.flatMap(d => [d.current, d.previous]), 0.001);
    const groupW = chartW / data.length;
    const barW = Math.min(20, (groupW - 12) / 2);

    // Grid
    const gridLines = [];
    const gridLabels = [];
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (chartH / 4) * i;
        const val = maxVal - (maxVal / 4) * i;
        gridLines.push(`<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="${getGridColor()}" stroke-dasharray="4,4"/>`);
        gridLabels.push(`<text x="${pad.left - 8}" y="${y + 4}" fill="${getMutedColor()}" font-size="10" text-anchor="end" font-family="var(--font-family)">${val.toFixed(val < 1 ? 3 : 1)}${suffix}</text>`);
    }

    const bars = data.map((d, i) => {
        const gx = pad.left + i * groupW + groupW / 2;
        const hPrev = (d.previous / maxVal) * chartH;
        const hCur = (d.current / maxVal) * chartH;

        return `
            <rect x="${gx - barW - 2}" y="${pad.top + chartH - hPrev}" width="${barW}" height="${hPrev}" rx="3" fill="${COLORS.blue}" opacity="0.7">
                <animate attributeName="height" from="0" to="${hPrev}" dur="0.6s" fill="freeze"/>
                <animate attributeName="y" from="${pad.top + chartH}" to="${pad.top + chartH - hPrev}" dur="0.6s" fill="freeze"/>
            </rect>
            <rect x="${gx + 2}" y="${pad.top + chartH - hCur}" width="${barW}" height="${hCur}" rx="3" fill="${COLORS.primary}" opacity="0.85">
                <animate attributeName="height" from="0" to="${hCur}" dur="0.6s" fill="freeze"/>
                <animate attributeName="y" from="${pad.top + chartH}" to="${pad.top + chartH - hCur}" dur="0.6s" fill="freeze"/>
            </rect>
            <text x="${gx}" y="${H - 8}" fill="${getMutedColor()}" font-size="11" text-anchor="middle" font-family="var(--font-family)">${d.label}</text>
        `;
    });

    // Legend
    const legendY = 12;
    const legend = `
        <rect x="${W - 180}" y="${legendY - 8}" width="10" height="10" rx="2" fill="${COLORS.blue}" opacity="0.7"/>
        <text x="${W - 166}" y="${legendY}" fill="${getSubTextColor()}" font-size="10" font-family="var(--font-family)">${previousLabel}</text>
        <rect x="${W - 95}" y="${legendY - 8}" width="10" height="10" rx="2" fill="${COLORS.primary}" opacity="0.85"/>
        <text x="${W - 81}" y="${legendY}" fill="${getSubTextColor()}" font-size="10" font-family="var(--font-family)">${currentLabel}</text>
    `;

    container.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${gridLines.join('')}${gridLabels.join('')}${bars.join('')}${legend}</svg>`;
}

/**
 * Mini Sparkline — for KPI cards
 */
export function renderSparkline(container, values, options = {}) {
    const { width = 80, height = 28, color = COLORS.primary } = options;
    if (!values || values.length < 2) return;

    const max = Math.max(...values, 0.001);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const step = width / (values.length - 1);

    const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * (height - 4) - 2).toFixed(1)}`);

    container.innerHTML = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
}

