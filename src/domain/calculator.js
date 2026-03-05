/**
 * Fuel Calculator — Port of Calculator.swift
 * Mass ↔ Volume conversions with density correction
 */

import { density15, densityT, vcf } from './density-corrector.js';
import { DensityMode, createDualResult, createVolConvResult } from './models.js';
import { products, getAstmCategory } from '../data/products.js';

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

/**
 * Liters → Liters (Volume temperature conversion)
 * Given V₁ at T₁, compute V₂ at T₂ using ASTM VCF corrections.
 *
 * Formula: V₁₅ = V₁ / VCF(T₁, ρ₁₅)  →  V₂ = V₁₅ × VCF(T₂, ρ₁₅)
 *   But since VCF converts ρ₁₅ → ρT:  densityT = density15 × VCF
 *   And V_T = mass / densityT = mass / (density15 × VCF)
 *   So V₁₅ = V₁ × (density_T₁ / density_15) and V₂ = V₁₅ × (density_15 / density_T₂)
 *
 * @param {number} volume - V₁ in liters at T₁
 * @param {number} tempFrom - T₁ (°C)
 * @param {number} tempTo - T₂ (°C)
 * @param {number|null} densityVal - Density in kg/l (optional, null = use product default)
 * @param {string} densityMode - 'at15' or 'atTemperature' (density given at 15°C or at T₁)
 * @param {string} productId - Product ID from products.js (e.g. 'gas_oil')
 * @returns {object} VolConvResult
 */
export function litersToLitersDual(volume, tempFrom, tempTo, densityVal, densityMode, productId) {
    // Determine ASTM category (refined/crude) for correction tables
    const astmCat = getAstmCategory(productId);

    // Resolve density — use provided or fall back to product midpoint
    let rho15;
    if (densityVal !== null && densityVal > 0) {
        if (densityMode === DensityMode.AT_15) {
            rho15 = densityVal;
        } else {
            // Density given at T₁ — convert to density at 15°C
            rho15 = density15(densityVal, tempFrom, astmCat);
        }
    } else {
        // Use product midpoint density (at 15°C)
        const prod = products.find(p => p.id === productId);
        if (prod && prod.densityRange) {
            rho15 = (prod.densityRange[0] + prod.densityRange[1]) / 2;
        } else {
            rho15 = 0.840; // fallback
        }
    }

    // Calculate densities at both temperatures
    const rhoT1 = densityT(rho15, tempFrom, astmCat);
    const rhoT2 = densityT(rho15, tempTo, astmCat);

    // V₁₅ = V₁ × (ρ_T₁ / ρ₁₅) — convert volume at T₁ to volume at 15°C
    // Using the relation: mass = V₁ × ρ_T₁ = V₁₅ × ρ₁₅
    const mass = volume * rhoT1;
    const v15 = mass / rho15;
    const vTarget = mass / rhoT2;

    return createVolConvResult({
        vInput: volume,
        tInput: tempFrom,
        tTarget: tempTo,
        v15,
        vTarget,
        rho15,
        rhoTInput: rhoT1,
        rhoTTarget: rhoT2,
    });
}
