/**
 * Loss Thresholds — KMGI-QCLP-PO-00-115-V2 Annex 1 (Internal) + Annex 4 (Contractual)
 * 
 * Season definitions:
 *   Summer = 01 May – 30 Sept
 *   Winter = 01 Oct – 30 Apr
 */

// ── Season helper ─────────────────────────────────────────────

export function getSeason(date = new Date()) {
    const month = date.getMonth() + 1; // 1-12
    return (month >= 5 && month <= 9) ? 'summer' : 'winter';
}

// ── Operation Types ───────────────────────────────────────────

export const OperationType = {
    RTCS_LOADING: 'rtcs_loading',
    RTCS_RECEPTION: 'rtcs_reception',
    AUTO_LOADING: 'auto_loading',
    AUTO_RECEPTION: 'auto_reception',
    VESSEL_LOADING: 'vessel_loading',
    VESSEL_RECEPTION: 'vessel_reception',
    BARGE_RECEPTION: 'barge_reception',
    MONTHLY_INVENTORY: 'monthly_inventory',
};

export const operationLabels = {
    rtcs_loading: 'RTCs Loading',
    rtcs_reception: 'RTCs Reception',
    auto_loading: 'Auto Loading',
    auto_reception: 'Auto Reception',
    vessel_loading: "Vessel's Loading",
    vessel_reception: "Vessel's Reception",
    barge_reception: "Barge's Reception",
    monthly_inventory: 'Monthly Inventory',
};

// ── Annex 1: Internal Thresholds ──────────────────────────────

export const internalThresholds = [
    // ═══ PEM (Petromidia) ═══════════════════════════════════════
    // RTCs Loading
    { division: 'PEM', operation: 'rtcs_loading', product: 'gas_oil', perUnit: { percent: 0.20, kgVac: 150, kgAir: 90 }, perTrain: {}, perMonth: { percent: 0.10 }, perYear: {} },
    { division: 'PEM', operation: 'rtcs_loading', product: 'gasoline', perUnit: { percent: 0.30, kgVac: 200, kgAir: 130 }, perTrain: { summer: 0.25, winter: 0.15 }, perMonth: { summer: 0.25, winter: 0.15 }, perYear: { percent: 0.19 } },
    { division: 'PEM', operation: 'rtcs_loading', product: 'jet', perUnit: { percent: 0.20, kgVac: 150, kgAir: 90 }, perTrain: {}, perMonth: { percent: 0.10 }, perYear: {} },

    // RTCs Reception
    { division: 'PEM', operation: 'rtcs_reception', product: 'naphtha', perUnit: {}, perTrain: {}, perMonth: { percent: 0.12 }, perYear: {} },
    { division: 'PEM', operation: 'rtcs_reception', product: 'bioethanol', perUnit: {}, perTrain: {}, perMonth: { percent: 0.10 }, perYear: {} },
    { division: 'PEM', operation: 'rtcs_reception', product: 'methanol', perUnit: {}, perTrain: {}, perMonth: { percent: 0.10 }, perYear: {} },
    { division: 'PEM', operation: 'rtcs_reception', product: 'biodiesel', perUnit: {}, perTrain: {}, perMonth: { percent: 0.10 }, perYear: {} },
    { division: 'PEM', operation: 'rtcs_reception', product: 'n_hexan', perUnit: {}, perTrain: {}, perMonth: { percent: 0.20 }, perYear: {} },

    // Auto Loading
    { division: 'PEM', operation: 'auto_loading', product: 'gas_oil', perUnit: { kgVac: 60, kgAir: 30 }, perTrain: {}, perMonth: { percent: 0.10 }, perYear: {} },
    { division: 'PEM', operation: 'auto_loading', product: 'gasoline', perUnit: { kgVac: 80, kgAir: 40 }, perTrain: {}, perMonth: { percent: 0.20 }, perYear: {} },
    { division: 'PEM', operation: 'auto_loading', product: 'jet', perUnit: { kgVac: 60, kgAir: 30 }, perTrain: {}, perMonth: { percent: 0.10 }, perYear: {} },

    // Vessel Loading
    { division: 'PEM', operation: 'vessel_loading', product: '*', perUnit: { percent: 0.30 }, perTrain: {}, perMonth: {}, perYear: {} },

    // Vessel Reception
    { division: 'PEM', operation: 'vessel_reception', product: 'crude_oil', perUnit: { percent: 0.30 }, perTrain: {}, perMonth: { summer: 0.15, winter: 0.13 }, perYear: { percent: 0.13 } },
    { division: 'PEM', operation: 'vessel_reception', product: 'srgo_srfo', perUnit: { percent: 0.30 }, perTrain: {}, perMonth: {}, perYear: {} },
    { division: 'PEM', operation: 'vessel_reception', product: 'etbe_mtbe', perUnit: { percent: 0.30 }, perTrain: {}, perMonth: {}, perYear: {} },
    { division: 'PEM', operation: 'vessel_reception', product: 'biodiesel', perUnit: { percent: 0.30 }, perTrain: {}, perMonth: {}, perYear: {} },
    { division: 'PEM', operation: 'vessel_reception', product: 'ethylene', perUnit: { percent: 0.10 }, perTrain: {}, perMonth: {}, perYear: {} },

    // ═══ DWS (Downstream Romania) ═══════════════════════════════
    // RTCs Reception
    { division: 'DWS', operation: 'rtcs_reception', product: 'gas_oil', perUnit: { percent: 0.20, kgVac: 150, kgAir: 90 }, perTrain: {}, perMonth: { percent: 0.10 }, perYear: {} },
    { division: 'DWS', operation: 'rtcs_reception', product: 'gasoline', perUnit: { percent: 0.30, kgVac: 200, kgAir: 130 }, perTrain: { summer: 0.30, winter: 0.20 }, perMonth: { summer: 0.30, winter: 0.20 }, perYear: { percent: 0.24 } },

    // Monthly Inventory
    { division: 'DWS', operation: 'monthly_inventory', product: 'gas_oil', perUnit: {}, perTrain: {}, perMonth: { percent: 0.05 }, perYear: {} },
    { division: 'DWS', operation: 'monthly_inventory', product: 'gasoline', perUnit: {}, perTrain: {}, perMonth: { summer: 0.15, winter: 0.10 }, perYear: { percent: 0.12 } },

    // Auto Loading
    { division: 'DWS', operation: 'auto_loading', product: 'gas_oil', perUnit: { kgVac: 60, kgAir: 30 }, perTrain: {}, perMonth: { percent: 0.10 }, perYear: {} },
    { division: 'DWS', operation: 'auto_loading', product: 'gasoline', perUnit: { kgVac: 80, kgAir: 40 }, perTrain: {}, perMonth: { percent: 0.20 }, perYear: {} },

    // ═══ RPM (Moldova) ══════════════════════════════════════════
    // Auto Reception
    { division: 'RPM', operation: 'auto_reception', product: 'gas_oil', perUnit: { kgVac: 60, kgAir: 30 }, perTrain: {}, perMonth: {}, perYear: { percent: 0.12 } },
    { division: 'RPM', operation: 'auto_reception', product: 'gasoline', perUnit: { kgVac: 80, kgAir: 40 }, perTrain: {}, perMonth: {}, perYear: { percent: 0.15 } },

    // Monthly Inventory
    { division: 'RPM', operation: 'monthly_inventory', product: 'gas_oil', perUnit: {}, perTrain: {}, perMonth: { percent: 0.05 }, perYear: {} },
    { division: 'RPM', operation: 'monthly_inventory', product: 'gasoline', perUnit: {}, perTrain: {}, perMonth: { summer: 0.15, winter: 0.10 }, perYear: { percent: 0.12 } },

    // Vessel Reception
    { division: 'RPM', operation: 'vessel_reception', product: '*', perUnit: { percent: 0.30 }, perTrain: {}, perMonth: {}, perYear: { percent: 0.20 } },

    // ═══ RPB (Bulgaria) ═════════════════════════════════════════
    // Barge Reception
    { division: 'RPB', operation: 'barge_reception', product: 'gas_oil', perUnit: { percent: 0.30 }, perTrain: {}, perMonth: {}, perYear: { percent: 0.20 } },

    // RTCs Reception
    { division: 'RPB', operation: 'rtcs_reception', product: 'gasoline', perUnit: {}, perTrain: { summer: 0.30, winter: 0.20 }, perMonth: { summer: 0.30, winter: 0.20 }, perYear: { percent: 0.24 } },

    // Monthly Inventory
    { division: 'RPB', operation: 'monthly_inventory', product: 'gas_oil', perUnit: {}, perTrain: {}, perMonth: { percent: 0.05 }, perYear: {} },
    { division: 'RPB', operation: 'monthly_inventory', product: 'gasoline', perUnit: {}, perTrain: {}, perMonth: { summer: 0.15, winter: 0.10 }, perYear: { percent: 0.12 } },

    // ═══ RPG (Georgia) ══════════════════════════════════════════
    // Vessel Reception
    { division: 'RPG', operation: 'vessel_reception', product: '*', perUnit: { percent: 0.30 }, perTrain: {}, perMonth: {}, perYear: { percent: 0.30 } },

    // Monthly Inventory Batumi
    { division: 'RPG', operation: 'monthly_inventory', product: 'gas_oil', perUnit: {}, perTrain: {}, perMonth: { percent: 0.05 }, perYear: {}, location: 'depot_batumi' },
    { division: 'RPG', operation: 'monthly_inventory', product: 'gasoline', perUnit: {}, perTrain: {}, perMonth: { summer: 0.15, winter: 0.10 }, perYear: { percent: 0.12 }, location: 'depot_batumi' },

    // RTCs Reception Tbilisi
    { division: 'RPG', operation: 'rtcs_reception', product: 'gas_oil', perUnit: { kgVac: 200 }, perTrain: {}, perMonth: { percent: 0.05 }, perYear: {}, location: 'depot_tbilisi' },
    { division: 'RPG', operation: 'rtcs_reception', product: 'gasoline', perUnit: { kgVac: 200 }, perTrain: {}, perMonth: { percent: 0.10 }, perYear: {}, location: 'depot_tbilisi' },

    // Monthly Inventory Tbilisi
    { division: 'RPG', operation: 'monthly_inventory', product: 'gas_oil', perUnit: {}, perTrain: {}, perMonth: { percent: 0.05 }, perYear: {}, location: 'depot_tbilisi' },
    { division: 'RPG', operation: 'monthly_inventory', product: 'gasoline', perUnit: {}, perTrain: {}, perMonth: { summer: 0.15, winter: 0.10 }, perYear: { percent: 0.12 }, location: 'depot_tbilisi' },
];

// ── Annex 4: Contractual Thresholds ───────────────────────────

export const contractualThresholds = [
    // DWS
    { division: 'DWS', operation: 'rtcs_reception', product: 'gas_oil', perUnit: { summer: 0.20 }, perTrain: { summer: 0.03 } },
    { division: 'DWS', operation: 'rtcs_reception', product: 'gasoline', perUnit: { summer: 0.25, winter: 0.20 }, perTrain: { summer: 0.05 } },
    { division: 'DWS', operation: 'auto_reception', product: 'dipstick', perUnit: { summer: 0.10 }, perTrain: {} },
    { division: 'DWS', operation: 'auto_reception', product: 'flowmeter', perUnit: { summer: 0.15 }, perTrain: {} },

    // RPM
    { division: 'RPM', operation: 'auto_reception', product: '*', perUnit: { summer: 0.15 }, perTrain: {} },

    // RPB
    { division: 'RPB', operation: 'auto_reception', product: '*', perUnit: { summer: 0.15 }, perTrain: {} },

    // RPG
    { division: 'RPG', operation: 'auto_reception', product: 'gas_oil', perUnit: { summer: 0.05 }, perTrain: {} },
    { division: 'RPG', operation: 'auto_reception', product: 'gasoline', perUnit: { summer: 0.12 }, perTrain: {} },
];

// ── Lookup functions ──────────────────────────────────────────

/**
 * Find applicable internal threshold
 * @param {string} division - Division code (PEM, DWS, etc.)
 * @param {string} operation - Operation type
 * @param {string} product - Product ID
 * @param {string} [location] - Optional location ID for RPG specifics
 * @returns {object|null} Matching threshold or null
 */
export function findInternalThreshold(division, operation, product, location = null) {
    // Try exact match first (with location if specified)
    let match = internalThresholds.find(t =>
        t.division === division &&
        t.operation === operation &&
        t.product === product &&
        (location ? t.location === location : !t.location)
    );

    // Try wildcard product match
    if (!match) {
        match = internalThresholds.find(t =>
            t.division === division &&
            t.operation === operation &&
            t.product === '*' &&
            (location ? t.location === location : !t.location)
        );
    }

    // Try without location constraint (fallback)
    if (!match && location) {
        match = internalThresholds.find(t =>
            t.division === division &&
            t.operation === operation &&
            (t.product === product || t.product === '*') &&
            !t.location
        );
    }

    return match || null;
}

/**
 * Find applicable contractual threshold
 */
export function findContractualThreshold(division, operation, product) {
    let match = contractualThresholds.find(t =>
        t.division === division &&
        t.operation === operation &&
        t.product === product
    );

    if (!match) {
        match = contractualThresholds.find(t =>
            t.division === division &&
            t.operation === operation &&
            t.product === '*'
        );
    }

    return match || null;
}

/**
 * Get the applicable threshold percentage for a given context
 * @param {object} threshold - Threshold object from findInternalThreshold/findContractualThreshold
 * @param {string} level - 'perUnit', 'perTrain', 'perMonth', 'perYear'
 * @param {string} season - 'summer' or 'winter'
 * @returns {number|null} Threshold percentage or null if not defined
 */
export function getThresholdPercent(threshold, level = 'perUnit', season = 'summer') {
    if (!threshold || !threshold[level]) return null;

    const levelData = threshold[level];

    // Check seasonal values first
    if (levelData[season] !== undefined) return levelData[season];

    // Check non-seasonal percent
    if (levelData.percent !== undefined) return levelData.percent;

    return null;
}
