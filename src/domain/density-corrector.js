/**
 * Density Corrector — API MPMS Chapter 11.1 (ASTM D1250)
 * Implements Table 54B (Refined Products) and Table 54A (Crude Oil)
 * 
 * This is a 1:1 port of DensityCorrector.swift
 */

const K0_REFINED = 341.0957;
const K0_CRUDE = 613.9723;

/**
 * Calculate thermal expansion coefficient α15
 * @param {number} density15_kgm3 - Density at 15°C in kg/m³
 * @param {string} product - 'refined' or 'crude'
 * @returns {number}
 */
function calculateAlpha15(density15_kgm3, product) {
    if (density15_kgm3 <= 0) return 0;
    const k0 = product === 'crude' ? K0_CRUDE : K0_REFINED;
    return k0 / (density15_kgm3 * density15_kgm3);
}

/**
 * Calculate Volume Correction Factor (VCF)
 * @param {number} density15_kgm3 - Density at 15°C in kg/m³
 * @param {number} temperature - Temperature in °C
 * @param {string} product - 'refined' or 'crude'
 * @returns {number}
 */
function calculateVCF(density15_kgm3, temperature, product) {
    if (Math.abs(temperature - 15.0) < 0.001) return 1.0;

    const alpha = calculateAlpha15(density15_kgm3, product);
    const deltaT = temperature - 15.0;
    const exponent = -alpha * deltaT * (1.0 + 0.8 * alpha * deltaT);

    return Math.exp(exponent);
}

/**
 * Convert density from ρT to ρ15 (iterative process)
 * @param {number} densityT - Density at temperature T (kg/l)
 * @param {number} temperature - Temperature in °C
 * @param {string} product - 'refined' or 'crude'
 * @returns {number} Density at 15°C (kg/l)
 */
export function density15(densityT, temperature, product = 'refined') {
    if (Math.abs(temperature - 15.0) < 0.001) return densityT;

    const rhoT_kgm3 = densityT * 1000.0;
    let rho15_current = rhoT_kgm3;
    let delta = 1.0;
    const tolerance = 0.00001;
    let iterations = 0;
    const maxIterations = 100;

    while (Math.abs(delta) > tolerance && iterations < maxIterations) {
        const vcf = calculateVCF(rho15_current, temperature, product);
        const rho15_next = rhoT_kgm3 / vcf;
        delta = rho15_next - rho15_current;
        rho15_current = rho15_next;
        iterations++;
    }

    return rho15_current / 1000.0;
}

/**
 * Convert density from ρ15 to ρT
 * @param {number} density15Val - Density at 15°C (kg/l)
 * @param {number} temperature - Temperature in °C
 * @param {string} product - 'refined' or 'crude'
 * @returns {number} Density at temperature T (kg/l)
 */
export function densityT(density15Val, temperature, product = 'refined') {
    const density15_kgm3 = density15Val * 1000.0;
    const vcf = calculateVCF(density15_kgm3, temperature, product);
    const densityT_kgm3 = density15_kgm3 * vcf;
    return densityT_kgm3 / 1000.0;
}

/**
 * Calculate VCF (public API)
 * @param {number} density15Val - Density at 15°C (kg/l)
 * @param {number} temperature - Temperature in °C
 * @param {string} product - 'refined' or 'crude'
 * @returns {number}
 */
export function vcf(density15Val, temperature, product = 'refined') {
    return calculateVCF(density15Val * 1000.0, temperature, product);
}
