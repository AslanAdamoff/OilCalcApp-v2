/**
 * Loss Evaluator — Evaluates calculated loss against KMGI policy thresholds
 * 
 * Returns status: within_norm | warning | critical
 * with details about which threshold was applied
 */

import { findInternalThreshold, findContractualThreshold, getThresholdPercent, getSeason } from '../data/loss-thresholds.js';

export const LossStatus = {
    WITHIN_NORM: 'within_norm',
    WARNING: 'warning',
    CRITICAL: 'critical',
    NOT_EVALUATED: 'not_evaluated',
};

/**
 * Evaluate a shipment's loss against applicable thresholds
 * 
 * @param {object} params
 * @param {number} params.lossPercent - Calculated loss percentage (absolute value)
 * @param {number} params.lossKg - Calculated loss in KG
 * @param {string} params.division - Division code (PEM, DWS, etc.)
 * @param {string} params.operation - Operation type (auto_reception, vessel_reception, etc.)
 * @param {string} params.product - Product ID (gas_oil, gasoline, etc.)
 * @param {string} [params.location] - Optional location ID for RPG specifics
 * @param {string} [params.season] - Season ('summer' or 'winter'), auto-detected if omitted
 * @param {string} [params.level] - Threshold level: 'perUnit', 'perTrain', 'perMonth', 'perYear'
 * @returns {object} Evaluation result
 */
export function evaluateLoss({
    lossPercent,
    lossKg = null,
    division,
    operation,
    product,
    location = null,
    season = null,
    level = 'perUnit',
}) {
    const s = season || getSeason();

    // Find applicable thresholds
    const internalTh = findInternalThreshold(division, operation, product, location);
    const contractualTh = findContractualThreshold(division, operation, product);

    // Get threshold percentages
    const internalLimit = internalTh ? getThresholdPercent(internalTh, level, s) : null;
    const contractualLimit = contractualTh ? getThresholdPercent(contractualTh, level, s) : null;

    // Get KG limits if applicable
    const kgVacLimit = internalTh?.perUnit?.kgVac || null;
    const kgAirLimit = internalTh?.perUnit?.kgAir || null;

    // Determine status
    const absLoss = Math.abs(lossPercent);
    let status = LossStatus.NOT_EVALUATED;
    let appliedThreshold = null;
    let message = '';

    if (internalLimit !== null) {
        if (absLoss <= internalLimit) {
            status = LossStatus.WITHIN_NORM;
            message = `Loss ${absLoss.toFixed(3)}% within internal limit ${internalLimit}%`;
            appliedThreshold = internalLimit;
        } else if (contractualLimit !== null && absLoss <= contractualLimit) {
            status = LossStatus.WARNING;
            message = `Loss ${absLoss.toFixed(3)}% exceeds internal limit ${internalLimit}%, within contractual ${contractualLimit}%`;
            appliedThreshold = contractualLimit;
        } else {
            status = LossStatus.CRITICAL;
            const limit = contractualLimit || internalLimit;
            message = `Loss ${absLoss.toFixed(3)}% exceeds ${contractualLimit ? 'contractual' : 'internal'} limit ${limit}%`;
            appliedThreshold = limit;
        }
    } else if (contractualLimit !== null) {
        // Only contractual threshold available
        if (absLoss <= contractualLimit) {
            status = LossStatus.WITHIN_NORM;
            message = `Loss ${absLoss.toFixed(3)}% within contractual limit ${contractualLimit}%`;
            appliedThreshold = contractualLimit;
        } else {
            status = LossStatus.CRITICAL;
            message = `Loss ${absLoss.toFixed(3)}% exceeds contractual limit ${contractualLimit}%`;
            appliedThreshold = contractualLimit;
        }
    }

    return {
        status,
        message,
        lossPercent: absLoss,
        appliedThreshold,
        internalLimit,
        contractualLimit,
        kgVacLimit,
        kgAirLimit,
        season: s,
        level,
        division,
        operation,
        product,
    };
}

/**
 * Get status visual properties
 */
export function getLossStatusDisplay(status) {
    switch (status) {
        case LossStatus.WITHIN_NORM:
            return { icon: '✅', label: 'Within Norm', cssClass: 'status-ok', color: '#22c55e' };
        case LossStatus.WARNING:
            return { icon: '⚠️', label: 'Warning', cssClass: 'status-warning', color: '#f59e0b' };
        case LossStatus.CRITICAL:
            return { icon: '🔴', label: 'Critical', cssClass: 'status-critical', color: '#ef4444' };
        default:
            return { icon: '⬜', label: 'Not Evaluated', cssClass: 'status-none', color: '#6b7280' };
    }
}

/**
 * Determine operation type from transport type and whether loading or unloading
 */
export function getOperationType(transportType, isLoading = false) {
    switch (transportType) {
        case 'vessel':
            return isLoading ? 'vessel_loading' : 'vessel_reception';
        case 'barge':
            return isLoading ? 'vessel_loading' : 'barge_reception';
        case 'rail':
            return isLoading ? 'rtcs_loading' : 'rtcs_reception';
        case 'truck':
            return isLoading ? 'auto_loading' : 'auto_reception';
        case 'pipeline':
            return isLoading ? 'auto_loading' : 'auto_reception';
        default:
            return 'auto_reception';
    }
}
