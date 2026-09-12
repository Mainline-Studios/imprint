import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider } from "../firebase/app";
import { completeVerifyLinkIfPresent, sendVerifyLink, sendVerifyToUser } from "./emailLink";
import { requestDeviceStorage } from "../persist/quota";
import { useDocumentStore } from "../store/document";

export type AuthSnap = {
  user: User | null;
  ready: boolean;
  error: string | null;
  emailVerified: boolean;
  signInGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  sendVerifyEmail: (email?: string) => Promise<void>;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthSnap | null>(null);

function messageFor(err: unknown, via: "google" | "email" | "any" = "any"): string {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "";
  if (code === "auth/unauthorized-domain") {
    return "This site isn’t allowed to sign in yet. Add it under Firebase Authentication → Settings → Authorized domains (hostname only, like localhost).";
  }
  if (code === "auth/operation-not-allowed") {
    if (via === "google") {
      return "Google sign-in is not enabled yet. Turn it on in the Firebase console (Authentication → Sign-in method → Google).";
    }
    if (via === "email") {
      return "Email verification isn’t enabled yet. Sign in with Google, or turn on Email/Password and Email link in the Firebase console.";
    }
    return "That sign-in method isn’t enabled yet. Sign in with Google, or turn on Email/Password and Email link in the Firebase console.";
  }
  if (code === "auth/invalid-action-code" || code === "auth/expired-action-code") {
    return "That verification link is expired. Send a new one from Profile.";
  }
  if (code === "auth/invalid-email") return "Enter a valid email.";
  if (code === "auth/unauthorized-continue-uri") {
    return "This site isn’t allowed to finish email verification yet. Add it under Firebase Authentication → Settings → Authorized domains.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not finish that.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void requestDeviceStorage();
    void (async () => {
      try {
        if (await completeVerifyLinkIfPresent()) {
          const next = new URL(window.location.href);
          next.search = "";
          if (!next.hash || next.hash === "#") next.hash = "/profile";
          history.replaceState(null, "", `${next.pathname}${next.search}${next.hash}`);
        }
      } catch (err) {
        const msg = messageFor(err, "email");
        if (msg) setError(msg);
      }
    })();
  }, []);

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
      emailVerified: Boolean(user?.emailVerified),
      signInGoogle: async () => {
        setError(null);
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (err) {
          const msg = messageFor(err, "google");
          if (msg) setError(msg);
        }
      },
      signOutUser: async () => {
        setError(null);
        await signOut(auth);
      },
      sendVerifyEmail: async (email) => {
        setError(null);
        try {
          if (user && !user.emailVerified) {
            await sendVerifyToUser(user);
            return;
          }
          await sendVerifyLink(email || user?.email || "");
        } catch (err) {
          const msg = messageFor(err, "email");
          if (msg) setError(msg);
          throw err;
        }
      },
      reloadUser: async () => {
        if (!auth.currentUser) return;
        await auth.currentUser.reload();
        setUser(auth.currentUser);
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
