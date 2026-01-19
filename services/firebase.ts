import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase project configuration
// You can find this in your Firebase Console > Project Settings
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "AIzaSy_PLACEHOLDER",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "project-id.firebaseapp.com",
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "project-id",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "project-id.appspot.com",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;