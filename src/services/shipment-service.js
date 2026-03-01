/**
 * Shipment Service — CRUD for shipments in Firestore
 * Shared collection: all users see the same data
 */

import { db } from './firebase-config.js';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { getCurrentUser } from './auth-service.js';

const COLLECTION = 'shipments';

export const ShipmentService = {
    async loadAll() {
        try {
            const snapshot = await getDocs(
                query(collection(db, COLLECTION), orderBy('date', 'desc'))
            );
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error('Failed to load shipments from Firestore:', e);
            // Fallback to localStorage
            return this._loadLocal();
        }
    },

    async save(shipment) {
        try {
            const user = getCurrentUser();
            const data = {
                ...shipment,
                updatedAt: new Date().toISOString(),
            };
            if (!shipment.createdBy) {
                data.createdBy = user?.email || 'unknown';
            }
            await setDoc(doc(db, COLLECTION, shipment.id), data);
        } catch (e) {
            console.error('Failed to save shipment to Firestore:', e);
            // Fallback: save locally
            this._saveLocal(shipment);
        }
    },

    async remove(id) {
        try {
            await deleteDoc(doc(db, COLLECTION, id));
        } catch (e) {
            console.error('Failed to remove shipment from Firestore:', e);
        }
    },

    async getById(id) {
        try {
            const snap = await getDoc(doc(db, COLLECTION, id));
            return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        } catch (e) {
            console.error('Failed to get shipment:', e);
            return null;
        }
    },

    async getStats() {
        const all = await this.loadAll();
        return {
            total: all.length,
            completed: all.filter(s => s.status === 'completed').length,
            withinNorm: all.filter(s => s.lossStatus === 'within_norm').length,
            warning: all.filter(s => s.lossStatus === 'warning').length,
            critical: all.filter(s => s.lossStatus === 'critical').length,
        };
    },

    async clearAll() {
        try {
            const snapshot = await getDocs(collection(db, COLLECTION));
            const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);
        } catch (e) {
            console.error('Failed to clear shipments:', e);
        }
    },

    // ── localStorage fallback (offline mode) ──
    _loadLocal() {
        try {
            const data = localStorage.getItem('oilcalc_shipments');
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    },

    _saveLocal(shipment) {
        try {
            const shipments = this._loadLocal();
            const index = shipments.findIndex(s => s.id === shipment.id);
            if (index >= 0) shipments[index] = shipment;
            else shipments.unshift(shipment);
            localStorage.setItem('oilcalc_shipments', JSON.stringify(shipments));
        } catch (e) {
            console.error('Failed to save locally:', e);
        }
    },
};
