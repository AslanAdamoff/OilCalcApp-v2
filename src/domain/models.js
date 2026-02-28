/**
 * Models — Port of TripModels.swift, DualResult.swift, HistoryModels.swift, ProductType.swift
 */

let _uuid = 0;
export function uuid() {
    return `${Date.now()}-${++_uuid}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Product Type ──────────────────────────────────────────────
export const ProductType = {
    REFINED: 'refined',
    CRUDE: 'crude',
};

// ── Density Mode ──────────────────────────────────────────────
export const DensityMode = {
    AT_15: 'at15',
    AT_TEMPERATURE: 'atTemperature',
};

// ── Dual Result (Calculator output) ──────────────────────────
export function createDualResult({ at15, atT, density15 = null, densityT = null }) {
    return {
        id: uuid(),
        at15,
        atT,
        density15,
        densityT,
        get difference() { return this.atT - this.at15; },
        get percentDifference() {
            if (this.at15 === 0) return 0;
            return (this.difference / this.at15) * 100;
        },
    };
}

// ── Trip Point (user input) ──────────────────────────────────
export function createTripPoint({
    name = '',
    mass = '',
    density = '',
    temperature = '',
    densityMode = DensityMode.AT_15,
} = {}) {
    return {
        id: uuid(),
        name,
        mass,
        density,
        temperature,
        densityMode,
    };
}

// ── Point Result (calculated) ────────────────────────────────
export function createPointResult({ name = '', massKg, density15, densityT, temperature, v15Liters, vFactLiters }) {
    return {
        id: uuid(),
        name,
        massKg,
        density15,
        densityT,
        temperature,
        v15Liters,
        vFactLiters,
    };
}

// ── Trip Delta ───────────────────────────────────────────────
export function createTripDelta(from, to) {
    const massKg = to.massKg - from.massKg;
    const massPercent = from.massKg !== 0 ? (massKg / from.massKg) * 100 : 0;

    const v15 = to.v15Liters - from.v15Liters;
    const v15Percent = from.v15Liters !== 0 ? (v15 / from.v15Liters) * 100 : 0;

    const vFact = to.vFactLiters - from.vFactLiters;
    const vFactPercent = from.vFactLiters !== 0 ? (vFact / from.vFactLiters) * 100 : 0;

    return { massKg, massPercent, v15, v15Percent, vFact, vFactPercent };
}

// ── Trip Segment ─────────────────────────────────────────────
export function createTripSegment(from, to) {
    return {
        id: uuid(),
        fromPoint: from,
        toPoint: to,
        delta: createTripDelta(from, to),
    };
}

// ── Trip Result ──────────────────────────────────────────────
export function createTripResult(points) {
    const emptyPoint = createPointResult({
        massKg: 0, density15: 0, densityT: 0, temperature: 0, v15Liters: 0, vFactLiters: 0,
    });

    let totalDelta;
    let segments = [];

    if (points.length >= 2) {
        totalDelta = createTripDelta(points[0], points[points.length - 1]);
        for (let i = 0; i < points.length - 1; i++) {
            segments.push(createTripSegment(points[i], points[i + 1]));
        }
    } else {
        totalDelta = createTripDelta(emptyPoint, emptyPoint);
    }

    return {
        id: uuid(),
        points,
        totalDelta,
        segments,
        get A() { return points[0] || emptyPoint; },
        get B() { return points[points.length - 1] || emptyPoint; },
        get deltaMassKg() { return totalDelta.massKg; },
        get deltaMassPercent() { return totalDelta.massPercent; },
        get deltaV15() { return totalDelta.v15; },
        get deltaV15Percent() { return totalDelta.v15Percent; },
        get deltaVFact() { return totalDelta.vFact; },
        get deltaVFactPercent() { return totalDelta.vFactPercent; },
    };
}

// ── Calculation Type ─────────────────────────────────────────
export const CalculationType = {
    MAIN_CALC: 'mainCalc',
    TRIP_CALC: 'tripCalc',
};

// ── History Entry ────────────────────────────────────────────
export function createHistoryEntry({ type, dualResult = null, tripResult = null, parameters = {} }) {
    return {
        id: uuid(),
        date: new Date().toISOString(),
        type,
        dualResult,
        tripResult,
        parameters,
    };
}

// ── Trip Template ────────────────────────────────────────────
export function createTripTemplate({ name, points, productType }) {
    return {
        id: uuid(),
        name,
        points,
        productType,
    };
}
