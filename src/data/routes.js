/**
 * Routes — Predefined logistics routes between locations
 * Configurable: users can add custom routes via settings
 */

export const TransportType = {
    VESSEL: 'vessel',
    BARGE: 'barge',
    PIPELINE: 'pipeline',
    RAIL: 'rail',
    TRUCK: 'truck',
};

export const transportLabels = {
    vessel: { name: 'Vessel (Ship)', nameRu: 'Корабль/Танкер', icon: '🚢' },
    barge: { name: 'Barge', nameRu: 'Баржа', icon: '🚢' },
    pipeline: { name: 'Pipeline', nameRu: 'Трубопровод', icon: '🔧' },
    rail: { name: 'Rail (RTC)', nameRu: 'Ж/Д цистерна', icon: '🚂' },
    truck: { name: 'Truck', nameRu: 'Автоцистерна', icon: '🚛' },
};

const STORAGE_KEY = 'oilcalc_custom_routes';

/** Default routes from the KMG logistics network */
export const defaultRoutes = [
    // Romania → Georgia
    { id: 'npz_to_batumi_port', from: 'npz_petromidia', to: 'port_batumi', transport: TransportType.VESSEL, name: 'НПЗ → Порт Батуми', division: 'RPG' },

    // Georgia internal
    { id: 'batumi_port_to_depot', from: 'port_batumi', to: 'depot_batumi', transport: TransportType.PIPELINE, name: 'Порт → Депо Батуми', division: 'RPG' },
    { id: 'batumi_to_tbilisi', from: 'depot_batumi', to: 'depot_tbilisi', transport: TransportType.RAIL, name: 'Депо Батуми → Депо Тбилиси (ЖД)', division: 'RPG' },
    { id: 'batumi_to_tbilisi_truck', from: 'depot_batumi', to: 'depot_tbilisi', transport: TransportType.TRUCK, name: 'Депо Батуми → Депо Тбилиси (Авто)', division: 'RPG' },
    { id: 'batumi_to_azs', from: 'depot_batumi', to: 'azs_geo', transport: TransportType.TRUCK, name: 'Депо Батуми → АЗС Грузия', division: 'RPG' },
    { id: 'tbilisi_to_azs', from: 'depot_tbilisi', to: 'azs_geo', transport: TransportType.TRUCK, name: 'Депо Тбилиси → АЗС Грузия', division: 'RPG' },

    // Romania internal
    { id: 'npz_to_depot_ro_rail', from: 'npz_petromidia', to: 'depot_ro_1', transport: TransportType.RAIL, name: 'НПЗ → Депо Румыния (ЖД)', division: 'DWS' },
    { id: 'npz_to_depot_ro_truck', from: 'npz_petromidia', to: 'depot_ro_1', transport: TransportType.TRUCK, name: 'НПЗ → Депо Румыния (Авто)', division: 'DWS' },
    { id: 'npz_to_azs_ro', from: 'npz_petromidia', to: 'azs_ro', transport: TransportType.TRUCK, name: 'НПЗ → АЗС Румыния', division: 'PEM' },

    // Romania → Bulgaria
    { id: 'npz_to_ruse', from: 'npz_petromidia', to: 'depot_ruse', transport: TransportType.BARGE, name: 'НПЗ → Депо Русе (по воде)', division: 'RPB' },
    { id: 'ruse_to_azs', from: 'depot_ruse', to: 'azs_bg', transport: TransportType.TRUCK, name: 'Депо Русе → АЗС Болгария', division: 'RPB' },

    // Romania → Moldova
    { id: 'depot_ro_to_chisinau', from: 'depot_ro_1', to: 'depot_chisinau', transport: TransportType.RAIL, name: 'Депо Румыния → Депо Кишинёв (ЖД)', division: 'RPM' },
    { id: 'depot_ro_to_chisinau_truck', from: 'depot_ro_1', to: 'depot_chisinau', transport: TransportType.TRUCK, name: 'Депо Румыния → Депо Кишинёв (Авто)', division: 'RPM' },
    { id: 'chisinau_to_azs', from: 'depot_chisinau', to: 'azs_md', transport: TransportType.TRUCK, name: 'Депо Кишинёв → АЗС Молдова', division: 'RPM' },
];

/** Get all routes (defaults + custom) */
export function getAllRoutes() {
    const custom = loadCustomRoutes();
    return [...defaultRoutes, ...custom];
}

/** Get routes filtered by division */
export function getRoutesByDivision(divisionCode) {
    return getAllRoutes().filter(r => r.division === divisionCode);
}

/** Get a single route by ID */
export function getRoute(id) {
    return getAllRoutes().find(r => r.id === id) || null;
}

/** Get transport label info */
export function getTransportLabel(type) {
    return transportLabels[type] || { name: type, nameRu: type, icon: '📦' };
}

// ── Custom routes persistence ─────────────────────────────────

function loadCustomRoutes() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Failed to load custom routes:', e);
        return [];
    }
}

function saveCustomRoutes(routes) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
    } catch (e) {
        console.error('Failed to save custom routes:', e);
    }
}

/** Add a custom route */
export function addCustomRoute(route) {
    const custom = loadCustomRoutes();
    custom.push({ ...route, id: route.id || `custom_route_${Date.now()}`, custom: true });
    saveCustomRoutes(custom);
}

/** Remove a custom route */
export function removeCustomRoute(id) {
    const custom = loadCustomRoutes().filter(r => r.id !== id);
    saveCustomRoutes(custom);
}
