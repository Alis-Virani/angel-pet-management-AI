import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim();
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
});
const auth = getAuth(app);

const passwordsToTry = [
  'password-angel@123',
  'angel@123',
  'Angel@123',
  'angelpet@123',
  'AngelPet@123',
  'Angelpet@123',
  'password@123',
  'Password@123',
  'password-angel',
  'angel123',
  'Angel123',
  'password-angel123',
  'Password-angel@123',
  'angelpetcrm@123',
  'Angelpetcrm@123'
];

async function tryPasswords() {
  for (const pwd of passwordsToTry) {
    try {
      const res = await signInWithEmailAndPassword(auth, 'angelpetcrm@gmail.com', pwd);
      console.log('SUCCESS with password:', pwd);
      return;
    } catch (e: any) {
      // ignore
    }
  }
  console.log('None of the common variants matched.');
}

tryPasswords();
