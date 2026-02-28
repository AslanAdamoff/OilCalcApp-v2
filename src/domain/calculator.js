/**
 * Fuel Calculator — Port of Calculator.swift
 * Mass ↔ Volume conversions with density correction
 */

import { density15, densityT } from './density-corrector.js';
import { DensityMode, createDualResult } from './models.js';

/**
 * Mass → Liters (Dual result at 15°C and at T°C)
 * @param {number} massKg
 * @param {number} density - Density in kg/l
 * @param {number} temperature - Temperature in °C
 * @param {string} densityMode - 'at15' or 'atTemperature'
 * @param {string} product - 'refined' or 'crude'
 * @returns {object} DualResult
 */
export function massToLitersDual(massKg, density, temperature, densityMode, product) {
    let rho15, rhoT;

    if (densityMode === DensityMode.AT_15) {
        rho15 = density;
        rhoT = densityT(rho15, temperature, product);
    } else {
        rhoT = density;
        rho15 = density15(rhoT, temperature, product);
    }

    const v15 = massKg / rho15;
    const vT = massKg / rhoT;

    return createDualResult({ at15: v15, atT: vT, density15: rho15, densityT: rhoT });
}

/**
 * Liters → Mass (Dual result at 15°C and at T°C)
 * @param {number} liters
 * @param {number} density - Density in kg/l
 * @param {number} temperature - Temperature in °C
 * @param {string} densityMode - 'at15' or 'atTemperature'
 * @param {string} product - 'refined' or 'crude'
 * @returns {object} DualResult
 */
export function litersToMassDual(liters, density, temperature, densityMode, product) {
    let rho15, rhoT;

    if (densityMode === DensityMode.AT_15) {
        rho15 = density;
        rhoT = densityT(rho15, temperature, product);
    } else {
        rhoT = density;
        rho15 = density15(rhoT, temperature, product);
    }

    const m15 = liters * rho15;
    const mT = liters * rhoT;

    return createDualResult({ at15: m15, atT: mT, density15: rho15, densityT: rhoT });
}
