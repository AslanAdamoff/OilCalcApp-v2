/**
 * Analytics Service — Data aggregation for dashboards
 * Computes KPIs, trends, risk scores from shipment data
 */

import { ShipmentService } from './shipment-service.js';
import { getDivision, divisions } from '../data/divisions.js';
import { getProduct, products } from '../data/products.js';
import { getRoute } from '../data/routes.js';
import { getLocation } from '../data/locations.js';

/**
 * Filter shipments by criteria
 */
export function filterShipments(shipments, { period, division, product, status } = {}) {
    let filtered = [...shipments];

    if (division && division !== 'all') {
        filtered = filtered.filter(s => s.division === division);
    }

    if (product && product !== 'all') {
        filtered = filtered.filter(s => s.product === product);
    }

    if (status && status !== 'all') {
        filtered = filtered.filter(s => s.lossStatus === status);
    }

    if (period && period !== 'all') {
        const now = new Date();
        let start;
        switch (period) {
            case '7d':
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '6m':
                start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                break;
            case '12m':
                start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
                break;
            case 'ytd':
                start = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                start = null;
        }
        if (start) {
            filtered = filtered.filter(s => new Date(s.date) >= start);
        }
    }

    return filtered;
}

/**
 * Get KPI summary
 */
export function getKPIs(shipments) {
    const total = shipments.length;
    const withinNorm = shipments.filter(s => s.lossStatus === 'within_norm').length;
    const warning = shipments.filter(s => s.lossStatus === 'warning').length;
    const critical = shipments.filter(s => s.lossStatus === 'critical').length;
    const notEvaluated = shipments.filter(s => s.lossStatus === 'not_evaluated').length;

    // Average loss %
    const completedWithLoss = shipments.filter(s => s.result?.evaluation?.lossPercent !== undefined);
    const avgLoss = completedWithLoss.length > 0
        ? completedWithLoss.reduce((sum, s) => sum + Math.abs(s.result.evaluation.lossPercent), 0) / completedWithLoss.length
        : 0;

    // Total loss in KG
    const totalLossKg = shipments
        .filter(s => s.result?.deltaMassKg !== undefined)
        .reduce((sum, s) => sum + Math.abs(s.result.deltaMassKg), 0);

    // Estimated financial impact (rough: $0.80/kg average)
    const financialImpact = totalLossKg * 0.80;

    // Compliance rate (% within norm of evaluated)
    const evaluated = total - notEvaluated;
    const complianceRate = evaluated > 0 ? (withinNorm / evaluated * 100) : 100;

    return {
        total,
        withinNorm,
        warning,
        critical,
        notEvaluated,
        avgLoss,
        totalLossKg,
        financialImpact,
        complianceRate,
    };
}

/**
 * Monthly trend data (last N months)
 */
export function getMonthlyTrend(shipments, months = 12) {
    const now = new Date();
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
        const year = now.getFullYear();
        const month = now.getMonth() - i;
        const d = new Date(year, month, 1);
        const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

        const monthShipments = shipments.filter(s => {
            const sd = new Date(s.date);
            return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth();
        });

        const losses = monthShipments.filter(s => s.result?.evaluation?.lossPercent !== undefined);
        const avgLoss = losses.length > 0
            ? losses.reduce((sum, s) => sum + Math.abs(s.result.evaluation.lossPercent), 0) / losses.length
            : 0;

        const totalKg = monthShipments
            .filter(s => s.result?.deltaMassKg !== undefined)
            .reduce((sum, s) => sum + Math.abs(s.result.deltaMassKg), 0);

        result.push({
            label: monthStr,
            month: d.getMonth(),
            year: d.getFullYear(),
            count: monthShipments.length,
            avgLoss: parseFloat(avgLoss.toFixed(3)),
            totalLossKg: Math.round(totalKg),
            withinNorm: monthShipments.filter(s => s.lossStatus === 'within_norm').length,
            warning: monthShipments.filter(s => s.lossStatus === 'warning').length,
            critical: monthShipments.filter(s => s.lossStatus === 'critical').length,
        });
    }

    return result;
}

/**
 * Division comparison data
 */
export function getDivisionComparison(shipments) {
    return divisions.map(div => {
        const divShipments = shipments.filter(s => s.division === div.code);
        const total = divShipments.length;
        const critical = divShipments.filter(s => s.lossStatus === 'critical').length;
        const warning = divShipments.filter(s => s.lossStatus === 'warning').length;
        const withinNorm = divShipments.filter(s => s.lossStatus === 'within_norm').length;

        const losses = divShipments.filter(s => s.result?.evaluation?.lossPercent !== undefined);
        const avgLoss = losses.length > 0
            ? losses.reduce((sum, s) => sum + Math.abs(s.result.evaluation.lossPercent), 0) / losses.length
            : 0;

        const totalLossKg = divShipments
            .filter(s => s.result?.deltaMassKg !== undefined)
            .reduce((sum, s) => sum + Math.abs(s.result.deltaMassKg), 0);

        // Risk score: 0-100
        const exceedanceRate = total > 0 ? ((critical + warning) / total) * 100 : 0;
        const riskScore = Math.min(100, Math.round(exceedanceRate * 1.5 + critical * 10));

        let riskLevel = 'low';
        if (riskScore >= 60) riskLevel = 'critical';
        else if (riskScore >= 30) riskLevel = 'warning';

        return {
            code: div.code,
            name: div.name,
            country: div.country,
            total,
            withinNorm,
            warning,
            critical,
            avgLoss: parseFloat(avgLoss.toFixed(3)),
            totalLossKg: Math.round(totalLossKg),
            financialImpact: Math.round(totalLossKg * 0.80),
            exceedanceRate: parseFloat(exceedanceRate.toFixed(1)),
            riskScore,
            riskLevel,
        };
    }).sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Product breakdown
 */
export function getProductBreakdown(shipments) {
    const productMap = {};

    shipments.forEach(s => {
        if (!productMap[s.product]) {
            const prod = getProduct(s.product);
            productMap[s.product] = {
                id: s.product,
                name: prod?.name || s.product,
                count: 0,
                critical: 0,
                warning: 0,
                withinNorm: 0,
                totalLossKg: 0,
            };
        }
        const p = productMap[s.product];
        p.count++;
        if (s.lossStatus === 'critical') p.critical++;
        if (s.lossStatus === 'warning') p.warning++;
        if (s.lossStatus === 'within_norm') p.withinNorm++;
        if (s.result?.deltaMassKg) p.totalLossKg += Math.abs(s.result.deltaMassKg);
    });

    return Object.values(productMap)
        .sort((a, b) => b.count - a.count);
}

/**
 * Critical alerts — shipments requiring attention
 */
export function getCriticalAlerts(shipments) {
    return shipments
        .filter(s => s.lossStatus === 'critical')
        .map(s => {
            const div = getDivision(s.division);
            const prod = getProduct(s.product);
            const route = getRoute(s.routeId);
            return {
                id: s.id,
                date: s.date,
                division: div?.code || s.division,
                divisionName: div?.name || s.division,
                product: prod?.name || s.product,
                route: route ? `${getLocation(route.from)?.name || route.from} → ${getLocation(route.to)?.name || route.to}` : 'Custom',
                lossPercent: s.result?.evaluation?.lossPercent || 0,
                lossKg: s.result?.deltaMassKg || 0,
                threshold: s.result?.evaluation?.appliedThreshold || 0,
                message: s.result?.evaluation?.message || '',
                batchNumber: s.batchNumber || '',
            };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20);
}

/**
 * Risk heatmap data for divisions
 */
export function getRiskHeatmap(shipments) {
    const divData = getDivisionComparison(shipments);
    return divData.map(d => ({
        code: d.code,
        name: d.name,
        country: d.country,
        riskScore: d.riskScore,
        riskLevel: d.riskLevel,
        total: d.total,
        critical: d.critical,
        warning: d.warning,
        exceedanceRate: d.exceedanceRate,
        avgLoss: d.avgLoss,
    }));
}
