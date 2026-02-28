/**
 * Shipment Service — CRUD for shipments in localStorage
 * Same pattern as existing HistoryService
 */

const STORAGE_KEY = 'oilcalc_shipments';

export const ShipmentService = {
    loadAll() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load shipments:', e);
            return [];
        }
    },

    save(shipment) {
        const shipments = this.loadAll();
        const index = shipments.findIndex(s => s.id === shipment.id);
        if (index >= 0) {
            shipments[index] = shipment;
        } else {
            shipments.unshift(shipment);
        }
        this._persist(shipments);
    },

    remove(id) {
        const shipments = this.loadAll().filter(s => s.id !== id);
        this._persist(shipments);
    },

    getById(id) {
        return this.loadAll().find(s => s.id === id) || null;
    },

    getByDivision(divisionCode) {
        return this.loadAll().filter(s => s.division === divisionCode);
    },

    getByStatus(lossStatus) {
        return this.loadAll().filter(s => s.lossStatus === lossStatus);
    },

    getStats() {
        const all = this.loadAll();
        return {
            total: all.length,
            completed: all.filter(s => s.status === 'completed').length,
            withinNorm: all.filter(s => s.lossStatus === 'within_norm').length,
            warning: all.filter(s => s.lossStatus === 'warning').length,
            critical: all.filter(s => s.lossStatus === 'critical').length,
        };
    },

    clearAll() {
        this._persist([]);
    },

    _persist(shipments) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(shipments));
        } catch (e) {
            console.error('Failed to save shipments:', e);
        }
    },
};
