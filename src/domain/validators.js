/**
 * Validators — Port of Validation.swift
 */

export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Parse and validate a number from text
 * @param {string} text
 * @param {string} field - Field name for error messages
 * @returns {number}
 */
export function parseNumber(text, field) {
    const clean = String(text).replace(',', '.').trim();
    if (!clean) throw new ValidationError(`Field "${field}" is empty`);
    const value = parseFloat(clean);
    if (isNaN(value)) throw new ValidationError(`Field "${field}" contains invalid number`);
    return value;
}

/**
 * Parse and validate a number within a range
 */
export function parseNumberInRange(text, field, min = null, max = null) {
    const value = parseNumber(text, field);
    if (min !== null && value < min) {
        const rangeStr = max !== null ? `${formatNum(min)} – ${formatNum(max)}` : `≥ ${formatNum(min)}`;
        throw new ValidationError(`Field "${field}" must be in range ${rangeStr}`);
    }
    if (max !== null && value > max) {
        const rangeStr = min !== null ? `${formatNum(min)} – ${formatNum(max)}` : `≤ ${formatNum(max)}`;
        throw new ValidationError(`Field "${field}" must be in range ${rangeStr}`);
    }
    return value;
}

function formatNum(v) {
    return v % 1 === 0 ? v.toFixed(0) : v.toFixed(2);
}

/** Validate density (0.60 – 1.10 kg/l) */
export function validateDensity(text, field) {
    return parseNumberInRange(text, field, 0.60, 1.10);
}

/** Validate temperature (-50 – +80 °C) */
export function validateTemperature(text, field) {
    return parseNumberInRange(text, field, -50, 80);
}

/** Validate mass (> 0) */
export function validateMass(text, field) {
    const value = parseNumber(text, field);
    if (value <= 0) throw new ValidationError(`Field "${field}" must be > 0`);
    return value;
}
