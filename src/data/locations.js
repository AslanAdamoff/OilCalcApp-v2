/**
 * Locations — Physical locations in the logistics network
 * Configurable: users can add custom locations via settings
 */

export const LocationType = {
    REFINERY: 'refinery',
    PORT: 'port',
    DEPOT: 'depot',
    STATION: 'station',
};

const STORAGE_KEY = 'oilcalc_custom_locations';

/** Default locations from the KMG logistics network */
export const defaultLocations = [
    // Romania
    { id: 'npz_petromidia', type: LocationType.REFINERY, name: 'Petromidia Refinery', city: 'Năvodari', country: 'RO', division: 'PEM' },
    { id: 'depot_ro_1', type: LocationType.DEPOT, name: 'Depot Romania', city: 'Romania', country: 'RO', division: 'DWS' },

    // Georgia
    { id: 'port_batumi', type: LocationType.PORT, name: 'Port Batumi', city: 'Batumi', country: 'GE', division: 'RPG' },
    { id: 'depot_batumi', type: LocationType.DEPOT, name: 'Depot Batumi', city: 'Batumi', country: 'GE', division: 'RPG' },
    { id: 'depot_tbilisi', type: LocationType.DEPOT, name: 'Depot Tbilisi', city: 'Tbilisi', country: 'GE', division: 'RPG' },

    // Bulgaria
    { id: 'depot_ruse', type: LocationType.DEPOT, name: 'Depot Ruse', city: 'Ruse', country: 'BG', division: 'RPB' },

    // Moldova
    { id: 'depot_chisinau', type: LocationType.DEPOT, name: 'Depot Chișinău', city: 'Chișinău', country: 'MD', division: 'RPM' },
];

/** Get all locations (defaults + custom) */
export function getAllLocations() {
    const custom = loadCustomLocations();
    return [...defaultLocations, ...custom];
}

/** Get locations filtered by country */
export function getLocationsByCountry(countryCode) {
    return getAllLocations().filter(l => l.country === countryCode);
}

/** Get locations filtered by type */
export function getLocationsByType(type) {
    return getAllLocations().filter(l => l.type === type);
}

/** Get a single location by ID */
export function getLocation(id) {
    return getAllLocations().find(l => l.id === id) || null;
}

// ── Custom locations persistence ──────────────────────────────

function loadCustomLocations() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Failed to load custom locations:', e);
        return [];
    }
}

function saveCustomLocations(locations) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
    } catch (e) {
        console.error('Failed to save custom locations:', e);
    }
}

/** Add a custom location */
export function addCustomLocation(location) {
    const custom = loadCustomLocations();
    custom.push({ ...location, id: location.id || `custom_${Date.now()}`, custom: true });
    saveCustomLocations(custom);
}

/** Remove a custom location */
export function removeCustomLocation(id) {
    const custom = loadCustomLocations().filter(l => l.id !== id);
    saveCustomLocations(custom);
}
