import {
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  sendEmailVerification,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  type User,
} from "firebase/auth";
import { auth } from "../firebase/app";

const EMAIL_KEY = "imprint-verify-email";

function authCode(err: unknown): string {
  return typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
}

function randomPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function profileContinueUrl(): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const trimmed = base.endsWith("/") ? base : `${base}/`;
  return `${trimmed}#/profile`;
}

export async function sendVerifyLink(email: string): Promise<void> {
  const next = email.trim();
  if (!next || !next.includes("@")) throw new Error("Enter a valid email.");
  try {
    await sendSignInLinkToEmail(auth, next, {
      url: profileContinueUrl(),
      handleCodeInApp: true,
    });
    localStorage.setItem(EMAIL_KEY, next);
    return;
  } catch (err) {
    if (authCode(err) !== "auth/operation-not-allowed") throw err;
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, next, randomPassword());
    await sendEmailVerification(cred.user, { url: profileContinueUrl() });
  } catch (err) {
    if (authCode(err) === "auth/email-already-in-use") {
      throw new Error("That email already has an account. Sign in with Google to expand storage.");
    }
    throw err;
  }
}

export async function sendVerifyToUser(user: User): Promise<void> {
  await sendEmailVerification(user, { url: profileContinueUrl() });
}

export async function completeVerifyLinkIfPresent(): Promise<boolean> {
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) return false;
  let email = localStorage.getItem(EMAIL_KEY)?.trim() ?? "";
  if (!email) email = window.prompt("Confirm the email we sent the link to")?.trim() ?? "";
  if (!email) throw new Error("That verification link needs the same email.");
  await signInWithEmailLink(auth, email, href);
  localStorage.removeItem(EMAIL_KEY);
  return true;
}

export function storedVerifyEmail(): string {
  return localStorage.getItem(EMAIL_KEY)?.trim() ?? "";
}
