import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = (match[2] || '').trim();
  }
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function check() {
  console.log('Target Firebase Project:', firebaseConfig.projectId);
  try {
    const res = await signInWithEmailAndPassword(auth, 'angelpetcrm@gmail.com', 'password-angel@123');
    console.log('Sign-in SUCCESS, uid:', res.user.uid);
  } catch (err: any) {
    console.log('Sign-in failed code:', err.code, 'message:', err.message);
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
      try {
        console.log('Attempting createUserWithEmailAndPassword...');
        const createRes = await createUserWithEmailAndPassword(auth, 'angelpetcrm@gmail.com', 'password-angel@123');
        console.log('User created successfully! uid:', createRes.user.uid);
      } catch (createErr: any) {
        console.log('Create user failed code:', createErr.code, 'message:', createErr.message);
      }
    }
  }
}

check();
