/**
 * Dashboard Page — Analytics Dashboard with KPIs, charts, filters, drill-down, and PDF export
 * Responsive: 1-col mobile → 2-col tablet → 3-col desktop
 */

import { ShipmentService } from '../services/shipment-service.js';
import { filterShipments, getKPIs, getMonthlyTrend, getDivisionComparison, getProductBreakdown, getCriticalAlerts, getRiskHeatmap, getTrendComparison } from '../services/analytics-service.js';
import { renderLineChart, renderBarChart, renderDonutChart, renderStackedBarChart, renderSparkline, renderGroupedBarChart } from '../components/chart-engine.js';
import { getLossStatusDisplay } from '../domain/loss-evaluator.js';
import { getProduct } from '../data/products.js';
import { getDivision, divisions } from '../data/divisions.js';
import { products } from '../data/products.js';
import { getRoute, getTransportLabel } from '../data/routes.js';
import { getLocation } from '../data/locations.js';
import { renderOperationDetails } from './operation-details-page.js';
import { openReportBuilder } from './report-builder.js';
import { getCurrentUser } from '../services/auth-service.js';

let currentFilters = { period: 'all', division: 'all', product: 'all', status: 'all' };
let _drillShipments = []; // Shipments in current drill-down view

/**
 * Role-based dashboard configuration
 * Determines which widgets each role can see
 */
function getRoleDashboardConfig(role) {
    const configs = {
        admin: { kpis: true, trend: true, heatmap: true, divisions: true, products: true, comparison: true, alerts: true, recent: true, filters: true, export: true },
        ceo: { kpis: true, trend: true, heatmap: true, divisions: true, products: true, comparison: true, alerts: true, recent: true, filters: true, export: true },
        manager: { kpis: true, trend: true, heatmap: true, divisions: true, products: false, comparison: true, alerts: true, recent: true, filters: true, export: true },
        qclp: { kpis: true, trend: false, heatmap: false, divisions: false, products: true, comparison: false, alerts: true, recent: true, filters: true, export: false },
        verifier: { kpis: true, trend: false, heatmap: false, divisions: false, products: false, comparison: false, alerts: true, recent: true, filters: false, export: false },
        operator: { kpis: true, trend: false, heatmap: false, divisions: false, products: false, comparison: false, alerts: false, recent: true, filters: false, export: false },
    };
    return configs[role] || configs.admin;
}

export function renderDashboardPage() {
    const page = document.createElement('div');
    page.className = 'page dashboard-page';
    currentFilters = { period: 'all', division: 'all', product: 'all', status: 'all' };

    page.innerHTML = `
        <div class="dashboard-header">
            <h1 class="page-title">Analytics</h1>
            <button class="btn-icon dashboard-export-btn" id="reportBuilderBtn" title="Build Custom Report">
                📝 <span class="export-label">Report</span>
            </button>
            <button class="btn-icon dashboard-export-btn" id="exportPdfBtn" title="Export PDF Report">
                📄 <span class="export-label">Export PDF</span>
            </button>
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar card">
            <div class="filter-row">
                <div class="filter-item">
                    <label class="filter-label">Period</label>
                    <select class="field-input field-select filter-select" id="filterPeriod">
                        <option value="all">All Time</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="6m">Last 6 Months</option>
                        <option value="12m">Last 12 Months</option>
                        <option value="ytd">Year to Date</option>
                    </select>
                </div>
                <div class="filter-item">
                    <label class="filter-label">Division</label>
                    <select class="field-input field-select filter-select" id="filterDivision">
                        <option value="all">All Divisions</option>
                        ${divisions.map(d => `<option value="${d.code}">${d.code} — ${d.name}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-item">
                    <label class="filter-label">Product</label>
                    <select class="field-input field-select filter-select" id="filterProduct">
                        <option value="all">All Products</option>
                        ${products.filter(p => p.category === 'refined').map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-item">
                    <label class="filter-label">Status</label>
                    <select class="field-input field-select filter-select" id="filterStatus">
                        <option value="all">All</option>
                        <option value="within_norm">✅ Within Norm</option>
                        <option value="warning">⚠️ Warning</option>
                        <option value="critical">🔴 Critical</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- KPI Row -->
        <div class="kpi-row" id="kpiRow"></div>

        <!-- Charts Grid -->
        <div class="dashboard-grid">
            <div class="widget widget-trend" id="widgetTrend">
                <div class="widget-header">
                    <h3 class="widget-title">📈 Loss Trend (12 Months)</h3>
                </div>
                <div class="widget-body chart-container" id="chartTrend"></div>
            </div>

            <div class="widget widget-heatmap" id="widgetHeatmap">
                <div class="widget-header">
                    <h3 class="widget-title">🗺️ Division Risk Map</h3>
                </div>
                <div class="widget-body" id="chartHeatmap"></div>
            </div>

            <div class="widget widget-divisions" id="widgetDivisions">
                <div class="widget-header">
                    <h3 class="widget-title">📊 Division Comparison</h3>
                </div>
                <div class="widget-body chart-container" id="chartDivisions"></div>
            </div>

            <div class="widget widget-products" id="widgetProducts">
                <div class="widget-header">
                    <h3 class="widget-title">🛢️ Product Breakdown</h3>
                </div>
                <div class="widget-body chart-container" id="chartProducts"></div>
            </div>
        </div>

        <!-- Trend Comparison -->
        <div class="widget widget-comparison" id="widgetComparison">
            <div class="widget-header">
                <h3 class="widget-title">📊 Trend Comparison</h3>
                <div class="comparison-toggle" id="comparisonToggle">
                    <button class="comp-tab active" data-mode="mom">Month vs Month</button>
                    <button class="comp-tab" data-mode="yoy">Year vs Year</button>
                </div>
            </div>
            <div class="widget-body">
                <div class="comparison-kpis" id="comparisonKpis"></div>
                <div class="chart-container" id="chartComparison"></div>
            </div>
        </div>

        <!-- Critical Alerts -->
        <div class="widget widget-alerts" id="widgetAlerts">
            <div class="widget-header">
                <h3 class="widget-title">🚨 Critical Alerts</h3>
                <span class="alert-badge" id="alertBadge">0</span>
            </div>
            <div class="widget-body" id="alertsList"></div>
        </div>

        <!-- Recent Operations -->
        <div class="widget widget-recent" id="widgetRecent">
            <div class="widget-header">
                <h3 class="widget-title">📋 Recent Operations</h3>
            </div>
            <div class="widget-body" id="recentList"></div>
        </div>

        <!-- Drill-Down Modal -->
        <div class="drill-modal-overlay" id="drillModal" style="display:none">
            <div class="drill-modal">
                <div class="drill-modal-header">
                    <h3 id="drillTitle">Details</h3>
                    <button class="btn-icon drill-close" id="drillClose">✕</button>
                </div>
                <div class="drill-modal-body" id="drillBody"></div>
            </div>
        </div>
    `;

    // Setup filter listeners
    setTimeout(() => {
        setupFilters(page);
        setupExport(page);
        refreshDashboard(page);
        applyRoleDashboard(page);
    }, 50);

    return page;
}

function applyRoleDashboard(page) {
    const user = getCurrentUser();
    const role = user?.role || 'admin';
    const cfg = getRoleDashboardConfig(role);

    // Map widget IDs to config keys
    const widgetMap = {
        widgetTrend: 'trend',
        widgetHeatmap: 'heatmap',
        widgetDivisions: 'divisions',
        widgetProducts: 'products',
        widgetComparison: 'comparison',
        widgetAlerts: 'alerts',
        widgetRecent: 'recent',
    };

    Object.entries(widgetMap).forEach(([id, key]) => {
        const el = page.querySelector(`#${id}`);
        if (el && !cfg[key]) el.style.display = 'none';
    });

    // Hide filter bar if role doesn't use filters
    if (!cfg.filters) {
        const filterBar = page.querySelector('.filter-bar');
        if (filterBar) filterBar.style.display = 'none';
    }

    // Hide export buttons
    if (!cfg.export) {
        page.querySelector('#exportPdfBtn')?.parentElement && (page.querySelector('#exportPdfBtn').style.display = 'none');
        page.querySelector('#reportBuilderBtn')?.parentElement && (page.querySelector('#reportBuilderBtn').style.display = 'none');
    }

    // Add role label to header
    const header = page.querySelector('.dashboard-header .page-title');
    if (header && role !== 'admin' && role !== 'ceo') {
        const roleLabels = { manager: 'Manager View', qclp: 'Quality Control', verifier: 'Verifier View', operator: 'My Operations' };
        header.innerHTML = `Analytics <span class="dash-role-label">${roleLabels[role] || ''}</span>`;
    }
}

function setupFilters(page) {
    ['filterPeriod', 'filterDivision', 'filterProduct', 'filterStatus'].forEach(id => {
        const el = page.querySelector(`#${id}`);
        if (el) {
            el.addEventListener('change', () => {
                currentFilters.period = page.querySelector('#filterPeriod')?.value || 'all';
                currentFilters.division = page.querySelector('#filterDivision')?.value || 'all';
                currentFilters.product = page.querySelector('#filterProduct')?.value || 'all';
                currentFilters.status = page.querySelector('#filterStatus')?.value || 'all';
                refreshDashboard(page);
            });
        }
    });

    // Drill-down modal close
    page.querySelector('#drillClose')?.addEventListener('click', () => closeDrillDown(page));
    page.querySelector('#drillModal')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('drill-modal-overlay')) closeDrillDown(page);
    });
}

function setupExport(page) {
    page.querySelector('#exportPdfBtn')?.addEventListener('click', () => {
        exportDashboardPDF(page);
    });
    page.querySelector('#reportBuilderBtn')?.addEventListener('click', () => {
        openReportBuilder();
    });
}

async function refreshDashboard(page) {
    const allShipments = await ShipmentService.loadAll();
    const shipments = filterShipments(allShipments, currentFilters);

    renderKPIs(page, shipments, allShipments);
    renderTrendChart(page, shipments);
    renderHeatmap(page, shipments);
    renderDivisionChart(page, shipments);
    renderProductChart(page, shipments);
    renderAlerts(page, shipments);
    renderRecentOps(page, shipments);
    renderTrendComparison(page, allShipments);
}

function renderKPIs(page, shipments, allShipments) {
    const kpis = getKPIs(shipments);
    const trend = getMonthlyTrend(allShipments, 6);

    const container = page.querySelector('#kpiRow');
    if (!container) return;

    const prevMonth = trend.length >= 2 ? trend[trend.length - 2] : null;
    const curMonth = trend.length >= 1 ? trend[trend.length - 1] : null;
    const trendDirection = prevMonth && curMonth
        ? (curMonth.avgLoss > prevMonth.avgLoss ? '↑' : curMonth.avgLoss < prevMonth.avgLoss ? '↓' : '→')
        : '';
    const trendColor = trendDirection === '↑' ? 'var(--red)' : trendDirection === '↓' ? 'var(--green)' : 'var(--text-muted)';

    const kpiCards = [
        { key: 'total', icon: '📊', value: kpis.total, label: 'Total Shipments', cls: '' },
        { key: 'compliance', icon: '✅', value: `${kpis.complianceRate.toFixed(0)}%`, label: 'Compliance Rate', cls: 'kpi-ok' },
        { key: 'warning', icon: '⚠️', value: kpis.warning, label: 'Warnings', cls: 'kpi-warning' },
        { key: 'critical', icon: '🔴', value: kpis.critical, label: 'Critical', cls: 'kpi-critical' },
        { key: 'avgLoss', icon: '📉', value: `${kpis.avgLoss.toFixed(3)}%`, label: `Avg Loss <span style="color:${trendColor};font-weight:700">${trendDirection}</span>`, cls: 'kpi-loss' },
        { key: 'financial', icon: '💰', value: `$${formatFinancial(kpis.financialImpact)}`, label: 'Est. Impact', cls: 'kpi-finance' },
    ];

    container.innerHTML = kpiCards.map(k => `
        <div class="kpi-card-v2 ${k.cls}" data-drill="kpi" data-kpi-key="${k.key}" style="cursor:pointer">
            <div class="kpi-icon">${k.icon}</div>
            <div class="kpi-value">${k.value}</div>
            <div class="kpi-label">${k.label}</div>
        </div>
    `).join('');

    // KPI drill-down click handlers
    container.querySelectorAll('[data-drill="kpi"]').forEach(card => {
        card.addEventListener('click', () => {
            const key = card.dataset.kpiKey;
            showKPIDrillDown(page, key, shipments, kpis);
        });
    });
}

function renderTrendChart(page, shipments) {
    const container = page.querySelector('#chartTrend');
    if (!container) return;
    const data = getMonthlyTrend(shipments, 12);
    requestAnimationFrame(() => {
        renderLineChart(container, data, { valueKey: 'avgLoss', suffix: '%' });
    });
}

function renderHeatmap(page, shipments) {
    const container = page.querySelector('#chartHeatmap');
    if (!container) return;
    const data = getRiskHeatmap(shipments);

    if (data.length === 0 || data.every(d => d.total === 0)) {
        container.innerHTML = '<div class="chart-empty">No data for heatmap</div>';
        return;
    }

    container.innerHTML = `
        <div class="heatmap-grid">
            ${data.map(d => {
        const bgColor = d.riskLevel === 'critical' ? 'rgba(248,113,113,0.18)'
            : d.riskLevel === 'warning' ? 'rgba(245,158,11,0.18)'
                : 'rgba(52,211,153,0.15)';
        const borderColor = d.riskLevel === 'critical' ? 'rgba(248,113,113,0.4)'
            : d.riskLevel === 'warning' ? 'rgba(245,158,11,0.4)'
                : 'rgba(52,211,153,0.3)';
        const statusDot = d.riskLevel === 'critical' ? '🔴'
            : d.riskLevel === 'warning' ? '🟡'
                : '🟢';

        return `
                    <div class="heatmap-cell" data-drill="division" data-division="${d.code}" style="background:${bgColor};border-color:${borderColor};cursor:pointer">
                        <div class="heatmap-cell-header">
                            <span class="heatmap-entity">${d.code}</span>
                            <span class="heatmap-status">${statusDot}</span>
                        </div>
                        <div class="heatmap-country">${d.country}</div>
                        <div class="heatmap-stats">
                            <span>${d.total} ops</span>
                            <span>${d.avgLoss.toFixed(3)}% avg</span>
                        </div>
                        <div class="heatmap-bar">
                            <div class="heatmap-bar-fill" style="width:${Math.min(100, d.exceedanceRate)}%;background:${borderColor}"></div>
                        </div>
                        <div class="heatmap-exceedance">${d.exceedanceRate}% exceedance</div>
                    </div>
                `;
    }).join('')}
        </div>
    `;

    // Heatmap drill-down
    container.querySelectorAll('[data-drill="division"]').forEach(cell => {
        cell.addEventListener('click', () => {
            const divCode = cell.dataset.division;
            showDivisionDrillDown(page, divCode, shipments);
        });
    });
}

function renderDivisionChart(page, shipments) {
    const container = page.querySelector('#chartDivisions');
    if (!container) return;

    const data = getDivisionComparison(shipments);

    requestAnimationFrame(() => {
        renderStackedBarChart(container, data.map(d => ({
            label: d.code,
            withinNorm: d.withinNorm,
            warning: d.warning,
            critical: d.critical,
        })), { height: 200 });
    });
}

function renderProductChart(page, shipments) {
    const container = page.querySelector('#chartProducts');
    if (!container) return;

    const data = getProductBreakdown(shipments);
    const total = data.reduce((s, d) => s + d.count, 0);

    requestAnimationFrame(() => {
        renderDonutChart(container, data.slice(0, 6).map(d => ({
            label: d.name,
            value: d.count,
        })), {
            size: Math.min(200, container.clientWidth - 40),
            thickness: 28,
            centerValue: String(total),
            centerLabel: 'shipments',
        });
    });
}

function renderAlerts(page, shipments) {
    const alerts = getCriticalAlerts(shipments);
    const badge = page.querySelector('#alertBadge');
    const container = page.querySelector('#alertsList');
    if (!container) return;

    if (badge) {
        badge.textContent = String(alerts.length);
        badge.style.display = alerts.length > 0 ? 'inline-flex' : 'none';
    }

    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="chart-empty" style="padding:var(--spacing-lg)">
                <div style="font-size:2rem;margin-bottom:8px">✅</div>
                <div>No critical alerts</div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="alerts-table">
            <div class="alerts-table-header">
                <span>Date</span>
                <span>Division</span>
                <span>Product</span>
                <span>Loss</span>
                <span>Threshold</span>
            </div>
            ${alerts.slice(0, 10).map(a => {
        const dateStr = new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        return `
                    <div class="alerts-table-row">
                        <span class="alert-date">${dateStr}</span>
                        <span class="alert-division">${a.division}</span>
                        <span class="alert-product">${a.product}</span>
                        <span class="alert-loss" style="color:var(--red);font-weight:700">${a.lossPercent.toFixed(3)}%</span>
                        <span class="alert-threshold">${a.threshold}%</span>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

function renderRecentOps(page, shipments) {
    const container = page.querySelector('#recentList');
    if (!container) return;

    const recent = shipments.slice(0, 8);

    if (recent.length === 0) {
        container.innerHTML = `
            <div class="chart-empty" style="padding:var(--spacing-xl)">
                <div style="font-size:2.5rem;margin-bottom:12px">📦</div>
                <div>No shipments yet</div>
                <div style="font-size:var(--font-sm);color:var(--text-muted);margin-top:4px">
                    Create shipments in the Shipment tab<br/>
                    or load demo data from Settings
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="ops-table">
            <div class="ops-table-header">
                <span>Status</span>
                <span>Div</span>
                <span>Product</span>
                <span>Route</span>
                <span>Loss</span>
                <span>Date</span>
            </div>
            ${recent.map(s => {
        const status = getLossStatusDisplay(s.lossStatus);
        const product = getProduct(s.product);
        const division = getDivision(s.division);
        const route = getRoute(s.routeId);
        const dateStr = new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const lossStr = s.result?.evaluation?.lossPercent !== undefined
            ? s.result.evaluation.lossPercent.toFixed(3) + '%'
            : '—';
        const routeStr = route
            ? `${(getLocation(route.from)?.name || route.from || '').split(' ')[0]}→${(getLocation(route.to)?.name || route.to || '').split(' ')[0]}`
            : '—';

        return `
                    <div class="ops-table-row clickable" data-shipment-id="${s.id}">
                        <span>${status.icon}</span>
                        <span class="ops-division">${division?.code || s.division}</span>
                        <span class="ops-product">${product?.name || s.product}</span>
                        <span class="ops-route">${routeStr}</span>
                        <span class="ops-loss" style="color:${status.color};font-weight:600">${lossStr}</span>
                        <span class="ops-date">${dateStr}</span>
                    </div>
                `;
    }).join('')}
        </div>
    `;

    // Click handler for Recent Ops rows
    container.querySelectorAll('.ops-table-row.clickable').forEach(row => {
        row.addEventListener('click', () => {
            const shipmentId = row.dataset.shipmentId;
            const shipment = recent.find(s => s.id === shipmentId);
            if (shipment) showOperationDetail(shipment);
        });
    });
}

// ── Trend Comparison Widget ──────────────────────────────────

let _comparisonMode = 'mom';
let _comparisonAllShipments = [];

function renderTrendComparison(page, allShipments) {
    _comparisonAllShipments = allShipments;
    const kpisContainer = page.querySelector('#comparisonKpis');
    const chartContainer = page.querySelector('#chartComparison');
    const toggle = page.querySelector('#comparisonToggle');
    if (!kpisContainer || !chartContainer) return;

    // Setup toggle handlers (once)
    if (toggle && !toggle.dataset.init) {
        toggle.dataset.init = '1';
        toggle.querySelectorAll('.comp-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                _comparisonMode = btn.dataset.mode;
                toggle.querySelectorAll('.comp-tab').forEach(b => b.classList.toggle('active', b === btn));
                renderComparisonContent(page);
            });
        });
    }

    renderComparisonContent(page);
}

function renderComparisonContent(page) {
    const kpisContainer = page.querySelector('#comparisonKpis');
    const chartContainer = page.querySelector('#chartComparison');
    if (!kpisContainer || !chartContainer) return;

    const data = getTrendComparison(_comparisonAllShipments, _comparisonMode);
    const { current, previous, deltas, divisionBreakdown, labels } = data;

    // Delta display helper
    function deltaHTML(d, inverse = false) {
        // For loss metrics, decrease is good (green), increase is bad (red)
        // For compliance, increase is good (green), decrease is bad (red)
        const isPositive = inverse ? d.abs < 0 : d.abs > 0;
        const isNegative = inverse ? d.abs > 0 : d.abs < 0;
        const arrow = d.abs > 0 ? '↑' : d.abs < 0 ? '↓' : '→';
        const color = isPositive ? 'var(--green, #34d399)' : isNegative ? 'var(--red, #f87171)' : 'var(--text-muted)';
        const pctStr = d.pct !== 0 ? ` (${d.pct > 0 ? '+' : ''}${d.pct}%)` : '';
        return `<span class="comp-delta" style="color:${color}">${arrow} ${Math.abs(d.abs).toLocaleString()}${pctStr}</span>`;
    }

    const cards = [
        { label: 'Total Ops', cur: current.total, prev: previous.total, delta: deltas.total, icon: '📊', inverse: false },
        { label: 'Compliance', cur: `${current.complianceRate}%`, prev: `${previous.complianceRate}%`, delta: deltas.complianceRate, icon: '✅', inverse: false },
        { label: 'Avg Loss', cur: `${current.avgLoss.toFixed(3)}%`, prev: `${previous.avgLoss.toFixed(3)}%`, delta: deltas.avgLoss, icon: '📉', inverse: true },
        { label: 'Critical', cur: current.critical, prev: previous.critical, delta: deltas.critical, icon: '🔴', inverse: true },
        { label: 'Total Loss', cur: `${current.totalLossKg.toLocaleString()} kg`, prev: `${previous.totalLossKg.toLocaleString()} kg`, delta: deltas.totalLossKg, icon: '⚖️', inverse: true },
        { label: 'Impact', cur: `$${current.financialImpact.toLocaleString()}`, prev: `$${previous.financialImpact.toLocaleString()}`, delta: deltas.financialImpact, icon: '💰', inverse: true },
    ];

    kpisContainer.innerHTML = `
        <div class="comp-period-labels">
            <span class="comp-period prev">${labels.previous}</span>
            <span class="comp-vs">vs</span>
            <span class="comp-period cur">${labels.current}</span>
        </div>
        <div class="comp-cards">
            ${cards.map(c => `
                <div class="comp-card">
                    <div class="comp-card-icon">${c.icon}</div>
                    <div class="comp-card-label">${c.label}</div>
                    <div class="comp-card-values">
                        <span class="comp-prev-val">${c.prev}</span>
                        <span class="comp-arrow">→</span>
                        <span class="comp-cur-val">${c.cur}</span>
                    </div>
                    <div class="comp-card-delta">${deltaHTML(c.delta, c.inverse)}</div>
                </div>
            `).join('')}
        </div>
    `;

    // Grouped bar chart for division comparison
    if (divisionBreakdown.length > 0) {
        requestAnimationFrame(() => {
            renderGroupedBarChart(chartContainer, divisionBreakdown, {
                suffix: '%',
                currentLabel: labels.current,
                previousLabel: labels.previous,
                height: 220,
            });
        });
    } else {
        chartContainer.innerHTML = '<div class="chart-empty">Not enough data for comparison</div>';
    }
}

// ── Drill-Down Modal ──────────────────────────────────────────

function showDrillDown(page, title, htmlContent) {
    const modal = page.querySelector('#drillModal');
    const titleEl = page.querySelector('#drillTitle');
    const bodyEl = page.querySelector('#drillBody');
    if (!modal || !titleEl || !bodyEl) return;

    titleEl.textContent = title;
    bodyEl.innerHTML = htmlContent;
    modal.style.display = 'flex';
    modal.classList.add('drill-active');

    // Drill-down row click handlers
    bodyEl.querySelectorAll('.drill-table-row.clickable').forEach(row => {
        row.addEventListener('click', () => {
            try {
                const data = JSON.parse(row.dataset.drillShipment);
                const shipment = _drillShipments.find(s => s.id === data.id);
                if (shipment) {
                    closeDrillDown(page);
                    setTimeout(() => showOperationDetail(shipment), 250);
                }
            } catch (e) { /* ignore */ }
        });
    });
}

function closeDrillDown(page) {
    const modal = page.querySelector('#drillModal');
    if (modal) {
        modal.classList.remove('drill-active');
        setTimeout(() => { modal.style.display = 'none'; }, 200);
    }
}

function showKPIDrillDown(page, key, shipments, kpis) {
    let title = '';
    let rows = [];
    _drillShipments = shipments; // Store for click handlers

    switch (key) {
        case 'total':
            title = 'All Shipments';
            rows = shipments.slice(0, 20).map(s => formatShipmentRow(s));
            break;
        case 'compliance':
            title = `Compliant Shipments (${kpis.complianceRate.toFixed(1)}%)`;
            rows = shipments.filter(s => s.lossStatus === 'within_norm').slice(0, 20).map(s => formatShipmentRow(s));
            break;
        case 'warning':
            title = `Warning Shipments (${kpis.warning})`;
            rows = shipments.filter(s => s.lossStatus === 'warning').slice(0, 20).map(s => formatShipmentRow(s));
            break;
        case 'critical':
            title = `Critical Shipments (${kpis.critical})`;
            rows = shipments.filter(s => s.lossStatus === 'critical').slice(0, 20).map(s => formatShipmentRow(s));
            break;
        case 'avgLoss':
            title = `Loss Distribution (Avg: ${kpis.avgLoss.toFixed(3)}%)`;
            const sorted = [...shipments].sort((a, b) =>
                (b.result?.evaluation?.lossPercent || 0) - (a.result?.evaluation?.lossPercent || 0)
            );
            rows = sorted.slice(0, 20).map(s => formatShipmentRow(s));
            break;
        case 'financial':
            title = `Estimated Financial Impact: $${formatFinancial(kpis.financialImpact)}`;
            const byLoss = [...shipments].sort((a, b) =>
                Math.abs(b.result?.deltaMassKg || 0) - Math.abs(a.result?.deltaMassKg || 0)
            );
            rows = byLoss.slice(0, 15).map(s => {
                const mass = Math.abs(s.result?.deltaMassKg || 0);
                const cost = (mass * 0.8).toFixed(0);
                return formatShipmentRow(s, `$${cost}`);
            });
            break;
    }

    const html = `
        <div class="drill-table">
            <div class="drill-table-header">
                <span>Date</span>
                <span>Division</span>
                <span>Product</span>
                <span>Loss %</span>
                <span>Status</span>
                ${key === 'financial' ? '<span>Impact</span>' : ''}
            </div>
            ${rows.join('')}
        </div>
        <div class="drill-footer">${rows.length} of ${shipments.length} shown</div>
    `;

    showDrillDown(page, title, html);
}

function showDivisionDrillDown(page, divCode, allShipments) {
    const div = getDivision(divCode);
    const divShipments = allShipments.filter(s => s.division === divCode);
    _drillShipments = divShipments; // Store for click handlers
    const kpis = getKPIs(divShipments);

    const html = `
        <div class="drill-kpi-summary">
            <div class="drill-kpi"><span class="drill-kpi-val">${kpis.total}</span><span class="drill-kpi-lbl">Shipments</span></div>
            <div class="drill-kpi"><span class="drill-kpi-val" style="color:var(--green)">${kpis.complianceRate.toFixed(0)}%</span><span class="drill-kpi-lbl">Compliant</span></div>
            <div class="drill-kpi"><span class="drill-kpi-val" style="color:var(--yellow)">${kpis.warning}</span><span class="drill-kpi-lbl">Warning</span></div>
            <div class="drill-kpi"><span class="drill-kpi-val" style="color:var(--red)">${kpis.critical}</span><span class="drill-kpi-lbl">Critical</span></div>
            <div class="drill-kpi"><span class="drill-kpi-val">${kpis.avgLoss.toFixed(3)}%</span><span class="drill-kpi-lbl">Avg Loss</span></div>
        </div>
        <div class="drill-table">
            <div class="drill-table-header">
                <span>Date</span>
                <span>Product</span>
                <span>Route</span>
                <span>Loss %</span>
                <span>Status</span>
            </div>
            ${divShipments.slice(0, 20).map(s => formatShipmentRow(s)).join('')}
        </div>
        <div class="drill-footer">${Math.min(20, divShipments.length)} of ${divShipments.length} shown</div>
    `;

    showDrillDown(page, `${div?.name || divCode} (${divCode})`, html);
}

function formatShipmentRow(s, extra = null) {
    const status = getLossStatusDisplay(s.lossStatus);
    const product = getProduct(s.product);
    const route = getRoute(s.routeId);
    const dateStr = new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const lossStr = s.result?.evaluation?.lossPercent !== undefined
        ? s.result.evaluation.lossPercent.toFixed(3) + '%'
        : '—';

    return `
        <div class="drill-table-row clickable" data-drill-shipment='${JSON.stringify({ id: s.id })}'>
            <span>${dateStr}</span>
            <span>${s.division}</span>
            <span>${product?.name || s.product}</span>
            <span style="color:${status.color};font-weight:600">${lossStr}</span>
            <span>${status.icon} ${status.label}</span>
            ${extra ? `<span style="font-weight:600">${extra}</span>` : ''}
        </div>
    `;
}

// ── Operation Detail Navigation ──────────────────────────────

function showOperationDetail(shipment) {
    const container = document.getElementById('pageContainer');
    if (!container) return;
    container.innerHTML = '';
    container.scrollTop = 0;
    container.appendChild(renderOperationDetails(shipment, () => {
        // Return to dashboard
        container.innerHTML = '';
        container.scrollTop = 0;
        container.appendChild(renderDashboardPage());
    }));
}

// ── PDF Export ────────────────────────────────────────────────

async function exportDashboardPDF(page) {
    const btn = page.querySelector('#exportPdfBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ <span class="export-label">Generating...</span>';
    }

    try {
        const { default: html2canvas } = await import('html2canvas');
        const { default: jsPDF } = await import('jspdf');

        // Capture dashboard content (excluding modal and export button)
        const dashContent = page.cloneNode(true);
        const modal = dashContent.querySelector('#drillModal');
        if (modal) modal.remove();
        const exportBtn = dashContent.querySelector('#exportPdfBtn');
        if (exportBtn) exportBtn.remove();

        // Temporarily append to body for rendering
        dashContent.style.position = 'absolute';
        dashContent.style.left = '-9999px';
        dashContent.style.width = '1200px';
        dashContent.style.background = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0a0e1a';
        document.body.appendChild(dashContent);

        const canvas = await html2canvas(dashContent, {
            scale: 2,
            useCORS: true,
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0a0e1a',
            width: 1200,
            windowWidth: 1200,
        });

        document.body.removeChild(dashContent);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const x = (pdfWidth - imgWidth * ratio) / 2;

        // Title
        pdf.setFontSize(14);
        pdf.setTextColor(50, 50, 50);
        pdf.text('OilCalcApp — Analytics Dashboard Report', pdfWidth / 2, 8, { align: 'center' });
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pdfWidth / 2, 13, { align: 'center' });

        const yOffset = 16;
        const availHeight = pdfHeight - yOffset - 5;
        const finalRatio = Math.min((pdfWidth - 10) / imgWidth, availHeight / imgHeight);

        pdf.addImage(imgData, 'PNG', x, yOffset, imgWidth * finalRatio, imgHeight * finalRatio);

        pdf.save(`OilCalcApp_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
        console.error('PDF export failed:', err);
        alert('PDF export failed. Please try again.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '📄 <span class="export-label">Export PDF</span>';
        }
    }
}

function formatFinancial(value) {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toFixed(0);
}
