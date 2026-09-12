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
  apiKey: fromEnv.apiKey || "AIzaSyA3Bvb7g746iSimxUGYy39qKeYGUqgoSO0",
  authDomain: fromEnv.authDomain || "project-5f017fe6-68a5-4a72-b2a.firebaseapp.com",
  projectId: fromEnv.projectId || "project-5f017fe6-68a5-4a72-b2a",
  storageBucket: fromEnv.storageBucket || "project-5f017fe6-68a5-4a72-b2a.firebasestorage.app",
  messagingSenderId: fromEnv.messagingSenderId || "560955070493",
  appId: fromEnv.appId || "1:560955070493:web:a4191e7635ee2f0089cef4",
};

export const FIRESTORE_DATABASE_ID = "imprint";
