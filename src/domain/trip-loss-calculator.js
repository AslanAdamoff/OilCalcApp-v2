/**
 * Trip Loss Calculator — Port of TripLossCalculator.swift
 * Calculates losses during transportation across N points
 */

import { density15, densityT } from './density-corrector.js';
import { DensityMode, createPointResult, createTripResult } from './models.js';

/**
 * Calculate result for a single point
 */
function calculatePoint({ name = '', massKg, density, temperature, densityMode, product }) {
    let rho15, rhoT;

    if (densityMode === DensityMode.AT_15) {
        rho15 = density;
        rhoT = densityT(rho15, temperature, product);
    } else {
        rhoT = density;
        rho15 = density15(rhoT, temperature, product);
    }

    const v15 = massKg / rho15;
    const vFact = massKg / rhoT;

    return createPointResult({
        name,
        massKg,
        density15: rho15,
        densityT: rhoT,
        temperature,
        v15Liters: v15,
        vFactLiters: vFact,
    });
}

/**
 * Calculate trip loss for N points
 * @param {Array} points - Array of TripPoint objects
 * @param {string} product - 'refined' or 'crude'
 * @returns {object} TripResult
 */
export function calculate(points, product) {
    const results = points.map(point => {
        const mass = parseFloat(String(point.mass).replace(',', '.')) || 0;
        const density = parseFloat(String(point.density).replace(',', '.')) || 0;
        const temp = parseFloat(String(point.temperature).replace(',', '.')) || 0;

        return calculatePoint({
            name: point.name,
            massKg: mass,
            density,
            temperature: temp,
            densityMode: point.densityMode,
            product,
        });
    });

    return createTripResult(results);
}
