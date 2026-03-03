/**
 * Auth Service — Firestore-based authentication
 * Users stored in 'users' collection with SHA-256 hashed passwords
 * Session persisted in localStorage
 */

import { db, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from './firebase-config.js';

const USERS_COLLECTION = 'users';
const SESSION_KEY = 'oilcalc_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

/** Role definitions with allowed tabs */
export const ROLES = {
    admin: { label: 'Administrator', tabs: ['shipment', 'calculator', 'dashboard', 'history', 'settings', 'admin'] },
    manager: { label: 'Manager / Director', tabs: ['dashboard', 'history', 'settings'] },
    qclp: { label: 'QCLP Specialist', tabs: ['shipment', 'calculator', 'dashboard', 'history', 'settings'] },
    verifier: { label: 'Verifier / Surveyor', tabs: ['shipment', 'calculator', 'history', 'settings'] },
    operator: { label: 'Operator', tabs: ['shipment', 'calculator', 'settings'] },
};

/** Default users seeded on first run */
const DEFAULT_USERS = [
    { email: 'admin@rompetrol.com', password: 'admin', role: 'admin', name: 'Administrator' },
    { email: 'ceo@rompetrol.com', password: 'ceo', role: 'manager', name: 'CEO' },
    { email: 'manager@rompetrol.com', password: 'manager', role: 'manager', name: 'Manager' },
    { email: 'qclp@rompetrol.com', password: 'qclp', role: 'qclp', name: 'QCLP Specialist' },
    { email: 'verifier@rompetrol.com', password: 'verifier', role: 'verifier', name: 'Verifier' },
    { email: 'operator@rompetrol.com', password: 'operator', role: 'operator', name: 'Operator' },
];

/** Hash password using SHA-256 */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '_oilcalc_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Seed default users if collection is empty */
export async function seedDefaultUsers() {
    try {
        const usersRef = collection(db, USERS_COLLECTION);
        const snapshot = await getDocs(usersRef);

        if (snapshot.size > 0) return; // Users already exist

        console.log('Seeding default users...');
        for (const user of DEFAULT_USERS) {
            const hash = await hashPassword(user.password);
            await setDoc(doc(db, USERS_COLLECTION, user.email), {
                email: user.email,
                passwordHash: hash,
                role: user.role,
                name: user.name,
                createdAt: new Date().toISOString(),
            });
        }
        console.log(`Seeded ${DEFAULT_USERS.length} default users`);
    } catch (e) {
        console.error('Failed to seed users:', e);
    }
}

/** Login with email and password */
export async function login(email, password) {
    try {
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, email.toLowerCase().trim()));
        if (!userDoc.exists()) {
            return { success: false, error: 'User not found' };
        }

        const userData = userDoc.data();
        const hash = await hashPassword(password);

        if (hash !== userData.passwordHash) {
            return { success: false, error: 'Wrong password' };
        }

        const session = {
            email: userData.email,
            name: userData.name,
            role: userData.role,
            loginAt: new Date().toISOString(),
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { success: true, user: session };
    } catch (e) {
        console.error('Login error:', e);
        return { success: false, error: 'Connection error. Please try again.' };
    }
}

/** Logout */
export function logout() {
    localStorage.removeItem(SESSION_KEY);
}

/** Get current user from session (auto-expires after 8h) */
export function getCurrentUser() {
    try {
        const data = localStorage.getItem(SESSION_KEY);
        if (!data) return null;
        const session = JSON.parse(data);
        // Check session expiry
        if (session.loginAt) {
            const elapsed = Date.now() - new Date(session.loginAt).getTime();
            if (elapsed > SESSION_TTL_MS) {
                logout();
                return null;
            }
        }
        return session;
    } catch {
        return null;
    }
}

/** Check if user is authenticated */
export function isAuthenticated() {
    return getCurrentUser() !== null;
}

/** Check if current user has a specific role */
export function hasRole(...roles) {
    const user = getCurrentUser();
    return user ? roles.includes(user.role) : false;
}

/** Get allowed tabs for current user */
export function getAllowedTabs() {
    const user = getCurrentUser();
    if (!user) return [];
    return ROLES[user.role]?.tabs || [];
}

/** Get all users (admin only) */
export async function getAllUsers() {
    try {
        const snapshot = await getDocs(collection(db, USERS_COLLECTION));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error('Failed to load users:', e);
        return [];
    }
}

/** Create a new user (admin only) */
export async function createUser(email, password, role, name) {
    try {
        const hash = await hashPassword(password);
        await setDoc(doc(db, USERS_COLLECTION, email.toLowerCase().trim()), {
            email: email.toLowerCase().trim(),
            passwordHash: hash,
            role,
            name,
            createdAt: new Date().toISOString(),
        });
        return { success: true };
    } catch (e) {
        console.error('Failed to create user:', e);
        return { success: false, error: e.message };
    }
}

/** Delete a user (admin only) */
export async function deleteUser(email) {
    try {
        await deleteDoc(doc(db, USERS_COLLECTION, email));
        return { success: true };
    } catch (e) {
        console.error('Failed to delete user:', e);
        return { success: false, error: e.message };
    }
}

/** Update user role (admin only) */
export async function updateUserRole(email, newRole) {
    try {
        const ref = doc(db, USERS_COLLECTION, email);
        const snap = await getDoc(ref);
        if (!snap.exists()) return { success: false, error: 'User not found' };

        await setDoc(ref, { ...snap.data(), role: newRole }, { merge: true });
        return { success: true };
    } catch (e) {
        console.error('Failed to update user:', e);
        return { success: false, error: e.message };
    }
}
