import { initializeApp, getApps, getApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch (e) {}
  try {
    const gProcess = (globalThis as any).process;
    if (typeof gProcess !== 'undefined' && gProcess && gProcess.env && gProcess.env[key]) {
      return gProcess.env[key] || '';
    }
  } catch (e) {}
  return '';
};

export const usingFirebaseEmulators = getEnvVar('VITE_FIREBASE_USE_EMULATORS') === 'true';
const emulatorProjectId = 'demo-angel-pet-audit';

export const firebaseConfig = {
  apiKey: usingFirebaseEmulators ? 'demo-api-key' : getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: usingFirebaseEmulators ? 'localhost' : getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: usingFirebaseEmulators ? emulatorProjectId : getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: usingFirebaseEmulators ? `${emulatorProjectId}.appspot.com` : getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: usingFirebaseEmulators ? '000000000000' : getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: usingFirebaseEmulators ? '1:0:web:emulator' : getEnvVar('VITE_FIREBASE_APP_ID'),
  measurementId: usingFirebaseEmulators ? '' : getEnvVar('VITE_FIREBASE_MEASUREMENT_ID')
};

export const isLiveFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'YOUR_API_KEY'
);

let app;
let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

export let firebaseReady: Promise<void> = Promise.resolve();

if (isLiveFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    if (usingFirebaseEmulators && app.options.projectId !== emulatorProjectId) {
      throw new Error('Refusing emulator mode because the default Firebase app is not the demo project.');
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    if (usingFirebaseEmulators) {
      if (firebaseConfig.projectId !== emulatorProjectId) {
        throw new Error('Firebase emulator mode must use the dedicated demo project.');
      }
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
      connectStorageEmulator(storage, '127.0.0.1', 9199);
    }
    firebaseReady = Promise.resolve();
  } catch (error) {
    console.warn('Firebase initialization warning:', error);
  }
} else {
  console.info('Using Client LocalStorage DB mode (No live Firebase keys found in VITE_FIREBASE_*)');
}

export { auth, db, storage };
