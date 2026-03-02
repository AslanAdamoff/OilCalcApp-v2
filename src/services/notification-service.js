/**
 * Notification Service — Alert detection and tracking
 * Monitors shipments for critical events and tracks read/unread status.
 * Stores notification state in localStorage.
 */

import { ShipmentService } from './shipment-service.js';
import { getProduct } from '../data/products.js';
import { getDivision } from '../data/divisions.js';
import { getRoute } from '../data/routes.js';
import { getLocation } from '../data/locations.js';

const STORAGE_KEY = 'oilcalc-notifications';
const MAX_NOTIFICATIONS = 50;

/**
 * Get all notifications from storage
 */
function loadNotifications() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

/**
 * Save notifications to storage
 */
function saveNotifications(notifications) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
}

/**
 * Check for new critical shipments and generate notifications
 */
export async function checkForNewAlerts() {
    const shipments = await ShipmentService.loadAll();
    const stored = loadNotifications();
    const seenIds = new Set(stored.map(n => n.shipmentId));

    const newNotifs = [];

    // Find critical shipments not yet notified
    shipments
        .filter(s => s.lossStatus === 'critical')
        .forEach(s => {
            if (!seenIds.has(s.id)) {
                const prod = getProduct(s.product);
                const div = getDivision(s.division);
                const route = getRoute(s.routeId);
                const routeStr = route
                    ? `${getLocation(route.from)?.name || route.from} → ${getLocation(route.to)?.name || route.to}`
                    : 'Custom route';

                newNotifs.push({
                    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    shipmentId: s.id,
                    type: 'critical_loss',
                    title: 'Critical Loss Detected',
                    message: `${div?.code || s.division} — ${prod?.name || s.product}: ${Math.abs(s.result?.evaluation?.lossPercent || 0).toFixed(3)}% loss on ${routeStr}`,
                    date: s.date,
                    createdAt: new Date().toISOString(),
                    read: false,
                    lossPercent: s.result?.evaluation?.lossPercent || 0,
                    division: s.division,
                    product: s.product,
                });
            }
        });

    // Also check for warning shipments with high loss (> 80% of threshold)
    shipments
        .filter(s => s.lossStatus === 'warning')
        .forEach(s => {
            const warnKey = `warn_${s.id}`;
            if (!seenIds.has(s.id) && !seenIds.has(warnKey)) {
                const prod = getProduct(s.product);
                const div = getDivision(s.division);

                newNotifs.push({
                    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    shipmentId: warnKey,
                    type: 'threshold_warning',
                    title: 'Warning: Near Threshold',
                    message: `${div?.code || s.division} — ${prod?.name || s.product}: ${Math.abs(s.result?.evaluation?.lossPercent || 0).toFixed(3)}% loss approaching limit`,
                    date: s.date,
                    createdAt: new Date().toISOString(),
                    read: false,
                    lossPercent: s.result?.evaluation?.lossPercent || 0,
                    division: s.division,
                    product: s.product,
                });
            }
        });

    if (newNotifs.length > 0) {
        const all = [...newNotifs, ...stored].slice(0, MAX_NOTIFICATIONS);
        saveNotifications(all);
    }

    return newNotifs.length;
}

/**
 * Get all notifications
 */
export function getNotifications() {
    return loadNotifications();
}

/**
 * Get unread notification count
 */
export function getUnreadCount() {
    return loadNotifications().filter(n => !n.read).length;
}

/**
 * Mark a notification as read
 */
export function markAsRead(notifId) {
    const all = loadNotifications();
    const notif = all.find(n => n.id === notifId);
    if (notif) {
        notif.read = true;
        saveNotifications(all);
    }
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead() {
    const all = loadNotifications();
    all.forEach(n => { n.read = true; });
    saveNotifications(all);
}

/**
 * Clear all notifications
 */
export function clearNotifications() {
    localStorage.removeItem(STORAGE_KEY);
}
