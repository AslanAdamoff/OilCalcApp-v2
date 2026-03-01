/**
 * Firebase Configuration — OilCalcApp v2.0
 * Project: oilcalcapp-web
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBKkF1hMBwolhGX-kwSce1lIK8FcM4WiR4",
    authDomain: "oilcalcapp-web.firebaseapp.com",
    projectId: "oilcalcapp-web",
    storageBucket: "oilcalcapp-web.firebasestorage.app",
    messagingSenderId: "733415524008",
    appId: "1:733415524008:web:64a539f945ea670757e49d",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
