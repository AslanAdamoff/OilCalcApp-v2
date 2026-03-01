/**
 * Divisions — KMG International business units
 * Based on KMGI-QCLP-PO-00-115-V2
 */

export const divisions = [
    { code: 'PEM', name: 'Petromidia', country: 'RO', countryName: 'Romania' },
    { code: 'DWS', name: 'Downstream Romania', country: 'RO', countryName: 'Romania' },
    { code: 'RPG', name: 'Rompetrol Georgia', country: 'GE', countryName: 'Georgia' },
    { code: 'RPB', name: 'Rompetrol Bulgaria', country: 'BG', countryName: 'Bulgaria' },
    { code: 'RPM', name: 'Rompetrol Moldova', country: 'MD', countryName: 'Moldova' },
];

/** Get division by code */
export function getDivision(code) {
    return divisions.find(d => d.code === code) || null;
}

/** Get all divisions for a country */
export function getDivisionsByCountry(countryCode) {
    return divisions.filter(d => d.country === countryCode);
}
