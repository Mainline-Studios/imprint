import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider } from "../firebase/app";
import { useDocumentStore } from "../store/document";

export type AuthSnap = {
  user: User | null;
  ready: boolean;
  error: string | null;
  signInGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthSnap | null>(null);

function messageFor(err: unknown): string {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "";
  if (code === "auth/unauthorized-domain") {
    return "This site isn’t allowed to sign in yet. Add it under Firebase Authentication → Settings → Authorized domains (hostname only, like localhost).";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled yet. Turn it on in the Firebase console (Authentication → Sign-in method → Google).";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not sign in with Google.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setReady(true);
      void useDocumentStore.getState().loadHome();
    });
    return unsub;
  }, []);

  const value = useMemo<AuthSnap>(
    () => ({
      user,
      ready,
      error,
      signInGoogle: async () => {
        setError(null);
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (err) {
          const msg = messageFor(err);
          if (msg) setError(msg);
        }
      },
      signOutUser: async () => {
        setError(null);
        await signOut(auth);
      },
    }),
    [user, ready, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthSnap {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
