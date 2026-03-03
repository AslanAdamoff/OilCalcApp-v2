/**
 * Firebase Configuration — OilCalcApp v2.0
 * Config loaded from environment variables (VITE_ prefix)
 * Fallback to hardcoded values for backward compatibility
 *
 * IMPORTANT: All Firebase imports are centralized here to prevent
 * Vite pre-bundling from creating separate module instances.
 * Other modules MUST import Firestore functions from this file,
 * NOT directly from 'firebase/firestore'.
 */

import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBKkF1hMBwolhGX-kwSce1lIK8FcM4WiR4",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "oilcalcapp-web.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "oilcalcapp-web",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "oilcalcapp-web.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "733415524008",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:733415524008:web:64a539f945ea670757e49d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, orderBy, limit };
