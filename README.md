# Imprint

A free, browser-based design studio. Work stays on this device in IndexedDB. Sign in with Google to keep designs with your account (Firestore).

## Live site

GitHub Pages: https://mainline-studios.github.io/imprint/

Local: `npm install` then `npm run dev`.

## Turn on Google sign-in

If the Google popup says the provider is disabled, in the [Firebase console](https://console.firebase.google.com/project/imprint-designs/authentication/providers):

1. Open **Authentication** → **Sign-in method**.
2. Click **Google**.
3. Enable it, pick a support email, and **Save**.

Also add these **Authorized domains** (hostname only, no `https://` or port): `localhost` and `mainline-studios.github.io`.

Firebase project id: `imprint-designs` (display name: Imprint Designs). Sign-in domain: `imprint-designs.firebaseapp.com`. Firestore database id: `imprint`.
