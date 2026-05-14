import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let db: Firestore;
try {
  // Safari can block Firestore webchannel; force long polling for compatibility.
  db = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch {
  db = getFirestore(app);
}

export { db };
