/**
 * Result Formatters — Port of Formatters.swift
 * Number formatting with specific precision for each quantity type
 */

/**
 * Format mass (2 decimal places, space grouping)
 * @param {number} value
 * @returns {string}
 */
export function formatMass(value) {
    return formatWithGrouping(value, 2);
}

/**
 * Format volume (2 decimal places, space grouping)
 */
export function formatVolume(value) {
    return formatWithGrouping(value, 2);
}

/**
 * Format percent (2 decimal places, with +/- prefix)
 */
export function formatPercent(value) {
    const prefix = value >= 0 ? '+' : '';
    return prefix + value.toFixed(2);
}

/**
 * Format density (3 decimal places)
 */
export function formatDensity(value) {
    return value.toFixed(3);
}

/**
 * Format temperature (1 decimal place)
 */
export function formatTemperature(value) {
    return value.toFixed(1);
}

/**
 * Internal: format number with space grouping for thousands
 */
function formatWithGrouping(value, decimals) {
    const parts = value.toFixed(decimals).split('.');
    // Add space grouping to integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
}
