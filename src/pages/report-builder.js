/**
 * Report Builder — Custom report generator with section selection,
 * date range, division/product filters, and PDF export.
 * Opened as a full-screen modal from the Dashboard.
 */

import { ShipmentService } from '../services/shipment-service.js';
import { filterShipments, getKPIs, getMonthlyTrend, getDivisionComparison, getProductBreakdown, getCriticalAlerts } from '../services/analytics-service.js';
import { renderLineChart, renderBarChart, renderDonutChart, renderStackedBarChart } from '../components/chart-engine.js';
import { divisions } from '../data/divisions.js';
import { products } from '../data/products.js';
import { getRoute, getTransportLabel } from '../data/routes.js';
import { getLocation } from '../data/locations.js';
import { getProduct } from '../data/products.js';
import { getLossStatusDisplay } from '../domain/loss-evaluator.js';

const REPORT_SECTIONS = [
    { id: 'summary', label: 'KPI Summary', icon: '📊', default: true },
    { id: 'trend', label: 'Loss Trend Chart', icon: '📈', default: true },
    { id: 'divisions', label: 'Division Analysis', icon: '🏢', default: true },
    { id: 'products', label: 'Product Breakdown', icon: '🛢️', default: true },
    { id: 'alerts', label: 'Critical Alerts', icon: '🚨', default: true },
    { id: 'operations', label: 'Recent Operations', icon: '📋', default: false },
];

let _reportModal = null;

/**
 * Open the Report Builder modal
 */
export function openReportBuilder() {
    if (_reportModal) return; // Already open

    const overlay = document.createElement('div');
    overlay.className = 'report-modal-overlay';
    _reportModal = overlay;

    overlay.innerHTML = `
        <div class="report-modal">
            <div class="report-modal-header">
                <h2 class="report-modal-title">📝 Report Builder</h2>
                <button class="btn-icon report-close" id="reportClose">✕</button>
            </div>

            <div class="report-modal-body">
                <!-- Settings Panel -->
                <div class="report-settings">
                    <div class="report-section-group">
                        <h3 class="report-group-title">Date Range</h3>
                        <div class="report-date-row">
                            <div class="report-field">
                                <label class="report-field-label">From</label>
                                <input type="date" class="report-input" id="reportDateFrom">
                            </div>
                            <div class="report-field">
                                <label class="report-field-label">To</label>
                                <input type="date" class="report-input" id="reportDateTo">
                            </div>
                        </div>
                    </div>

                    <div class="report-section-group">
                        <h3 class="report-group-title">Filters</h3>
                        <div class="report-filter-row">
                            <div class="report-field">
                                <label class="report-field-label">Division</label>
                                <select class="report-input" id="reportDivision">
                                    <option value="all">All Divisions</option>
                                    ${divisions.map(d => `<option value="${d.code}">${d.code} — ${d.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="report-field">
                                <label class="report-field-label">Product</label>
                                <select class="report-input" id="reportProduct">
                                    <option value="all">All Products</option>
                                    ${products.filter(p => p.category === 'refined').map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="report-section-group">
                        <h3 class="report-group-title">Sections</h3>
                        <div class="report-sections-grid">
                            ${REPORT_SECTIONS.map(s => `
                                <label class="report-section-check">
                                    <input type="checkbox" value="${s.id}" ${s.default ? 'checked' : ''}>
                                    <span class="report-check-icon">${s.icon}</span>
                                    <span class="report-check-label">${s.label}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <button class="report-generate-btn" id="reportGenerate">
                        <span id="reportGenText">📄 Generate Report</span>
                    </button>
                </div>

                <!-- Preview Panel -->
                <div class="report-preview" id="reportPreview">
                    <div class="report-preview-placeholder">
                        <div class="report-preview-icon">📋</div>
                        <p>Select sections and click <strong>Generate Report</strong> to preview</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Set default date range (last 30 days)
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    overlay.querySelector('#reportDateTo').value = now.toISOString().split('T')[0];
    overlay.querySelector('#reportDateFrom').value = from.toISOString().split('T')[0];

    // Close handlers
    overlay.querySelector('#reportClose').addEventListener('click', closeReportBuilder);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeReportBuilder();
    });

    // Generate handler
    overlay.querySelector('#reportGenerate').addEventListener('click', () => generateReport(overlay));

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('visible'));
}

function closeReportBuilder() {
    if (_reportModal) {
        _reportModal.classList.remove('visible');
        setTimeout(() => {
            _reportModal.remove();
            _reportModal = null;
        }, 300);
    }
}

async function generateReport(overlay) {
    const btn = overlay.querySelector('#reportGenerate');
    const textEl = overlay.querySelector('#reportGenText');
    const preview = overlay.querySelector('#reportPreview');
    btn.disabled = true;
    textEl.textContent = 'Generating...';

    try {
        // Get filter values
        const dateFrom = overlay.querySelector('#reportDateFrom').value;
        const dateTo = overlay.querySelector('#reportDateTo').value;
        const division = overlay.querySelector('#reportDivision').value;
        const product = overlay.querySelector('#reportProduct').value;

        // Get selected sections
        const selectedSections = [];
        overlay.querySelectorAll('.report-section-check input:checked').forEach(cb => {
            selectedSections.push(cb.value);
        });

        if (selectedSections.length === 0) {
            preview.innerHTML = '<div class="report-preview-placeholder"><p>⚠️ Please select at least one section</p></div>';
            btn.disabled = false;
            textEl.textContent = '📄 Generate Report';
            return;
        }

        // Load and filter data
        const allShipments = await ShipmentService.loadAll();
        let shipments = [...allShipments];

        // Date filter
        if (dateFrom) {
            shipments = shipments.filter(s => new Date(s.date) >= new Date(dateFrom));
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59);
            shipments = shipments.filter(s => new Date(s.date) <= to);
        }

        // Division/product filter
        shipments = filterShipments(shipments, { division, product });

        // Build report HTML
        const reportHTML = buildReportHTML(shipments, selectedSections, { dateFrom, dateTo, division, product });

        preview.innerHTML = `
            <div class="report-content" id="reportContent">
                ${reportHTML}
            </div>
            <div class="report-actions">
                <button class="report-export-btn" id="reportExportPdf">📥 Export as PDF</button>
            </div>
        `;

        // Render charts in the report content
        requestAnimationFrame(() => {
            renderReportCharts(preview, shipments, selectedSections);
        });

        // PDF export
        preview.querySelector('#reportExportPdf')?.addEventListener('click', () => {
            exportReportPDF(preview.querySelector('#reportContent'));
        });

    } catch (e) {
        console.error('Report generation failed:', e);
        preview.innerHTML = '<div class="report-preview-placeholder"><p>❌ Error generating report</p></div>';
    }

    btn.disabled = false;
    textEl.textContent = '📄 Generate Report';
}

function buildReportHTML(shipments, sections, filters) {
    const dateRange = `${filters.dateFrom || 'All'} — ${filters.dateTo || 'Now'}`;
    const divLabel = filters.division === 'all' ? 'All Divisions' : filters.division;
    const prodLabel = filters.product === 'all' ? 'All Products' : (getProduct(filters.product)?.name || filters.product);

    let html = `
        <div class="report-header-block">
            <h1 class="report-main-title">OilCalcApp — Loss Control Report</h1>
            <div class="report-meta-row">
                <span>📅 ${dateRange}</span>
                <span>🏢 ${divLabel}</span>
                <span>🛢️ ${prodLabel}</span>
                <span>📊 ${shipments.length} operations</span>
            </div>
        </div>
    `;

    // Summary KPIs
    if (sections.includes('summary')) {
        const kpis = getKPIs(shipments);
        html += `
            <div class="report-section">
                <h2 class="report-section-title">📊 KPI Summary</h2>
                <div class="report-kpi-grid">
                    <div class="report-kpi"><div class="report-kpi-val">${kpis.total}</div><div class="report-kpi-label">Total Ops</div></div>
                    <div class="report-kpi"><div class="report-kpi-val">${kpis.complianceRate.toFixed(0)}%</div><div class="report-kpi-label">Compliance</div></div>
                    <div class="report-kpi"><div class="report-kpi-val">${kpis.avgLoss.toFixed(3)}%</div><div class="report-kpi-label">Avg Loss</div></div>
                    <div class="report-kpi"><div class="report-kpi-val">${kpis.critical}</div><div class="report-kpi-label">Critical</div></div>
                    <div class="report-kpi"><div class="report-kpi-val">${kpis.totalLossKg.toLocaleString()} kg</div><div class="report-kpi-label">Total Loss</div></div>
                    <div class="report-kpi"><div class="report-kpi-val">$${kpis.financialImpact.toLocaleString()}</div><div class="report-kpi-label">Est. Impact</div></div>
                </div>
            </div>
        `;
    }

    // Trend Chart placeholder
    if (sections.includes('trend')) {
        html += `
            <div class="report-section">
                <h2 class="report-section-title">📈 Loss Trend</h2>
                <div class="report-chart" id="reportChartTrend" style="height:220px;"></div>
            </div>
        `;
    }

    // Division Analysis
    if (sections.includes('divisions')) {
        const divData = getDivisionComparison(shipments);
        html += `
            <div class="report-section">
                <h2 class="report-section-title">🏢 Division Analysis</h2>
                <div class="report-chart" id="reportChartDivisions" style="height:220px;"></div>
                <table class="report-table">
                    <thead>
                        <tr><th>Division</th><th>Ops</th><th>Avg Loss</th><th>Critical</th><th>Warning</th><th>Risk</th></tr>
                    </thead>
                    <tbody>
                        ${divData.map(d => `
                            <tr>
                                <td><strong>${d.code}</strong> ${d.name}</td>
                                <td>${d.total}</td>
                                <td>${d.avgLoss.toFixed(3)}%</td>
                                <td style="color:var(--red,#f87171)">${d.critical}</td>
                                <td style="color:var(--yellow,#f59e0b)">${d.warning}</td>
                                <td><span class="risk-badge risk-${d.riskLevel}">${d.riskScore}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Product Breakdown
    if (sections.includes('products')) {
        const prodData = getProductBreakdown(shipments);
        html += `
            <div class="report-section">
                <h2 class="report-section-title">🛢️ Product Breakdown</h2>
                <div class="report-chart" id="reportChartProducts" style="height:220px;"></div>
            </div>
        `;
    }

    // Critical Alerts
    if (sections.includes('alerts')) {
        const alerts = getCriticalAlerts(shipments);
        html += `
            <div class="report-section">
                <h2 class="report-section-title">🚨 Critical Alerts (${alerts.length})</h2>
                ${alerts.length > 0 ? `
                    <table class="report-table">
                        <thead><tr><th>Date</th><th>Division</th><th>Product</th><th>Route</th><th>Loss %</th><th>Threshold</th></tr></thead>
                        <tbody>
                            ${alerts.map(a => `
                                <tr>
                                    <td>${new Date(a.date).toLocaleDateString()}</td>
                                    <td>${a.division}</td>
                                    <td>${a.product}</td>
                                    <td>${a.route}</td>
                                    <td style="color:var(--red,#f87171);font-weight:700">${Math.abs(a.lossPercent).toFixed(3)}%</td>
                                    <td>${a.threshold.toFixed(3)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p class="report-empty">No critical alerts in selected period</p>'}
            </div>
        `;
    }

    // Recent Operations
    if (sections.includes('operations')) {
        const recent = [...shipments]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 30);
        html += `
            <div class="report-section">
                <h2 class="report-section-title">📋 Recent Operations (${Math.min(30, recent.length)})</h2>
                <table class="report-table">
                    <thead><tr><th>Date</th><th>Division</th><th>Product</th><th>Status</th><th>Loss %</th><th>Loss kg</th></tr></thead>
                    <tbody>
                        ${recent.map(s => {
            const status = getLossStatusDisplay(s.lossStatus);
            return `
                                <tr>
                                    <td>${new Date(s.date).toLocaleDateString()}</td>
                                    <td>${s.division}</td>
                                    <td>${getProduct(s.product)?.name || s.product}</td>
                                    <td>${status.icon} ${status.label}</td>
                                    <td>${s.result?.evaluation?.lossPercent !== undefined ? Math.abs(s.result.evaluation.lossPercent).toFixed(3) + '%' : '—'}</td>
                                    <td>${s.result?.deltaMassKg !== undefined ? Math.abs(s.result.deltaMassKg).toFixed(0) + ' kg' : '—'}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    html += `
        <div class="report-footer">
            <p>Generated by OilCalcApp v2.0 — ${new Date().toLocaleString()}</p>
        </div>
    `;

    return html;
}

function renderReportCharts(container, shipments, sections) {
    if (sections.includes('trend')) {
        const trendEl = container.querySelector('#reportChartTrend');
        if (trendEl) {
            const trendData = getMonthlyTrend(shipments, 12);
            renderLineChart(trendEl, trendData, { valueKey: 'avgLoss', suffix: '%' });
        }
    }

    if (sections.includes('divisions')) {
        const divEl = container.querySelector('#reportChartDivisions');
        if (divEl) {
            const divData = getDivisionComparison(shipments);
            renderBarChart(divEl, divData.map(d => ({
                label: d.code,
                value: parseFloat(d.avgLoss.toFixed(3)),
            })), { suffix: '%', horizontal: true });
        }
    }

    if (sections.includes('products')) {
        const prodEl = container.querySelector('#reportChartProducts');
        if (prodEl) {
            const prodData = getProductBreakdown(shipments);
            renderDonutChart(prodEl, prodData.map(p => ({
                label: p.name,
                value: p.count,
            })), { centerLabel: 'Products', centerValue: prodData.length.toString() });
        }
    }
}

async function exportReportPDF(contentEl) {
    if (!contentEl) return;
    try {
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf'),
        ]);

        const canvas = await html2canvas(contentEl, {
            scale: 2,
            backgroundColor: '#0c1024',
            useCORS: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        const imgW = pdfW - 20;
        const imgH = (canvas.height / canvas.width) * imgW;

        let yOffset = 10;
        const pageH = pdfH - 20;

        // Multi-page support
        if (imgH <= pageH) {
            pdf.addImage(imgData, 'PNG', 10, yOffset, imgW, imgH);
        } else {
            // Split across pages
            let remainingH = imgH;
            let srcY = 0;
            let page = 0;

            while (remainingH > 0) {
                if (page > 0) pdf.addPage();
                const sliceH = Math.min(pageH, remainingH);
                const srcSliceH = (sliceH / imgH) * canvas.height;

                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = srcSliceH;
                const ctx = sliceCanvas.getContext('2d');
                ctx.drawImage(canvas, 0, srcY, canvas.width, srcSliceH, 0, 0, canvas.width, srcSliceH);

                pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 10, 10, imgW, sliceH);
                srcY += srcSliceH;
                remainingH -= sliceH;
                page++;
            }
        }

        pdf.save(`OilCalcApp_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
        console.error('PDF export failed:', e);
        alert('PDF export failed. Please try again.');
    }
}
