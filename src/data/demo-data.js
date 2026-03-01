/**
 * Demo Data Generator — Creates realistic shipment data for dashboard demo
 * Generates 120+ shipments across 12 months, all divisions and products
 */

import { uuid } from '../domain/models.js';
import { divisions } from './divisions.js';
import { products } from './products.js';
import { defaultRoutes } from './routes.js';
import { ShipmentService } from '../services/shipment-service.js';
import { evaluateLoss, getOperationType } from '../domain/loss-evaluator.js';
import { getSeason } from './loss-thresholds.js';

const DEMO_KEY = 'oilcalc_demo_loaded';

/**
 * Check if demo data is already loaded
 */
export function isDemoLoaded() {
    return localStorage.getItem(DEMO_KEY) === 'true';
}

/**
 * Generate and save demo shipments
 */
export function loadDemoData() {
    const shipments = generateDemoShipments();
    shipments.forEach(s => ShipmentService.save(s));
    localStorage.setItem(DEMO_KEY, 'true');
    return shipments.length;
}

/**
 * Clear demo data flag
 */
export function clearDemoFlag() {
    localStorage.removeItem(DEMO_KEY);
}

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateDemoShipments() {
    const now = new Date();
    const shipments = [];

    // Distribution: more recent months have more shipments
    for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
        const baseCount = monthOffset < 3 ? randInt(12, 18) : randInt(6, 12);

        for (let i = 0; i < baseCount; i++) {
            const date = new Date(
                now.getFullYear(),
                now.getMonth() - monthOffset,
                randInt(1, 28),
                randInt(6, 20),
                randInt(0, 59)
            );

            const division = pick(divisions);
            const divRoutes = defaultRoutes.filter(r =>
                r.division === division.code || !r.division
            );
            const route = divRoutes.length > 0 ? pick(divRoutes) : pick(defaultRoutes);

            // Pick product based on route operation type
            const productOptions = products.filter(p =>
                p.category === 'refined' || Math.random() < 0.2
            );
            const product = pick(productOptions);

            // Generate realistic measurements
            const baseMass = rand(15000, 50000); // 15-50 tonnes
            const baseDensity = product.densityRange
                ? rand(product.densityRange[0], product.densityRange[1])
                : rand(0.72, 0.88);
            const baseTemp = date.getMonth() >= 4 && date.getMonth() <= 9
                ? rand(18, 35) // summer
                : rand(-5, 15); // winter

            // Loss simulation: 80% within norm, 15% warning, 5% critical
            const roll = Math.random();
            let lossMultiplier;
            if (roll < 0.80) {
                lossMultiplier = rand(0.0001, 0.0015); // within norm
            } else if (roll < 0.95) {
                lossMultiplier = rand(0.002, 0.003); // warning
            } else {
                lossMultiplier = rand(0.004, 0.008); // critical
            }

            const lossKg = baseMass * lossMultiplier;
            const unloadedMass = baseMass - lossKg;
            const lossPercent = (lossKg / baseMass) * 100;

            // Temperature drift
            const unloadTemp = baseTemp + rand(-3, 5);
            const unloadDensity = baseDensity + rand(-0.002, 0.002);

            const season = getSeason(date);
            const transportType = route.transportType || pick(['truck', 'rail', 'vessel']);
            const operation = getOperationType(transportType, false);

            const evaluation = evaluateLoss({
                lossPercent,
                lossKg,
                division: division.code,
                operation,
                product: product.id,
                season,
                level: 'perUnit',
            });

            const shipment = {
                id: uuid(),
                date: date.toISOString(),
                season,
                status: 'completed',
                lossStatus: evaluation.status,
                division: division.code,
                product: product.id,
                routeId: route.id,
                transportType,
                fromLocation: route.from || '',
                toLocation: route.to || '',
                batchNumber: `BL-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${randInt(100, 999)}`,
                blNumber: `${division.code}-${randInt(10000, 99999)}`,
                notes: '',
                loaded: {
                    id: uuid(),
                    label: 'Loaded',
                    massKg: Math.round(baseMass),
                    density: parseFloat(baseDensity.toFixed(4)),
                    temperature: parseFloat(baseTemp.toFixed(1)),
                    densityMode: 'at15',
                    massType: 'vac',
                },
                unloaded: {
                    id: uuid(),
                    label: 'Unloaded',
                    massKg: Math.round(unloadedMass),
                    density: parseFloat(unloadDensity.toFixed(4)),
                    temperature: parseFloat(unloadTemp.toFixed(1)),
                    densityMode: 'at15',
                    massType: 'vac',
                },
                result: {
                    massAt15_A: Math.round(baseMass),
                    massAt15_B: Math.round(unloadedMass),
                    deltaMassKg: -Math.round(lossKg),
                    evaluation: {
                        ...evaluation,
                        lossPercent: parseFloat(lossPercent.toFixed(4)),
                    },
                    completedAt: date.toISOString(),
                },
            };

            shipments.push(shipment);
        }
    }

    // Sort by date descending
    shipments.sort((a, b) => new Date(b.date) - new Date(a.date));
    return shipments;
}
