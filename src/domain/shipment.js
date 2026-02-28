/**
 * Shipment Model — Logistics shipment with full chain tracking
 * Wraps existing Trip calculation with logistics metadata
 */

import { uuid } from './models.js';
import { getSeason } from '../data/loss-thresholds.js';

export const ShipmentStatus = {
    DRAFT: 'draft',
    IN_TRANSIT: 'in_transit',
    COMPLETED: 'completed',
};

export const LossStatus = {
    WITHIN_NORM: 'within_norm',
    WARNING: 'warning',
    CRITICAL: 'critical',
    NOT_EVALUATED: 'not_evaluated',
};

/**
 * Create a measurement point (loaded or unloaded)
 */
export function createMeasurement({
    label = '',
    massKg = '',
    density = '',
    temperature = '',
    densityMode = 'at15',
    massType = 'vac', // 'vac' or 'air'
} = {}) {
    return {
        id: uuid(),
        label,
        massKg,
        density,
        temperature,
        densityMode,
        massType,
    };
}

/**
 * Create a new Shipment
 * @param {object} params
 * @returns {object} Shipment
 */
export function createShipment({
    division = '',
    product = '',
    routeId = '',
    transportType = '',
    fromLocation = '',
    toLocation = '',
    batchNumber = '',
    blNumber = '',
    date = new Date().toISOString(),
    notes = '',
} = {}) {
    return {
        id: uuid(),
        date,
        season: getSeason(new Date(date)),
        status: ShipmentStatus.DRAFT,
        lossStatus: LossStatus.NOT_EVALUATED,

        // Logistics metadata
        division,
        product,
        routeId,
        transportType,
        fromLocation,
        toLocation,
        batchNumber,
        blNumber,
        notes,

        // Measurements
        loaded: createMeasurement({ label: 'Loaded' }),
        unloaded: createMeasurement({ label: 'Unloaded' }),

        // Calculated results (populated after calculation)
        result: null,
    };
}

/**
 * Calculate shipment result from loaded/unloaded measurements
 * @param {object} shipment
 * @param {object} calcResult - Result from trip-loss-calculator.calculate()
 * @param {object} evaluationResult - Result from loss-evaluator
 * @returns {object} Updated shipment with results
 */
export function completeShipment(shipment, calcResult, evaluationResult) {
    return {
        ...shipment,
        status: ShipmentStatus.COMPLETED,
        lossStatus: evaluationResult.status,
        result: {
            ...calcResult,
            evaluation: evaluationResult,
            completedAt: new Date().toISOString(),
        },
    };
}
