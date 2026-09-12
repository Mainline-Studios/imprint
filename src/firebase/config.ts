const fromEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** Firebase web config (apiKey is expected in client apps). Named Firestore DB: imprint. */
export const firebaseConfig = {
  apiKey: fromEnv.apiKey || "AIzaSyA9EsKDY-WUiQy4xWUrfEfsTqMlyRXn4Vk",
  authDomain: fromEnv.authDomain || "imprint-designs.firebaseapp.com",
  projectId: fromEnv.projectId || "imprint-designs",
  storageBucket: fromEnv.storageBucket || "imprint-designs.firebasestorage.app",
  messagingSenderId: fromEnv.messagingSenderId || "612962355524",
  appId: fromEnv.appId || "1:612962355524:web:0db9cdac22c7184ec36f11",
};

export const FIRESTORE_DATABASE_ID = "imprint";
