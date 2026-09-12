# Imprint

A free, browser-based design studio. Work stays on this device in IndexedDB. Sign in with Google to keep designs with your account (Firestore).

## Live site

GitHub Pages: https://bdawgsawesome1-mainlinestudiosofficial.github.io/imprint/

Local: `npm install` then `npm run dev`.

## Turn on Google sign-in

If the Google popup says the provider is disabled, in the [Firebase console](https://console.firebase.google.com/project/project-5f017fe6-68a5-4a72-b2a/authentication/providers):

1. Open **Authentication** → **Sign-in method**.
2. Click **Google**.
3. Enable it, pick a support email, and **Save**.

Also add these **Authorized domains** (hostname only, no `https://` or port): `localhost` and `bdawgsawesome1-mainlinestudiosofficial.github.io`.

Firebase project id: `project-5f017fe6-68a5-4a72-b2a` (existing “My First Project”; a new `imprint-studio` project could not be created because this Google account is at its Cloud project quota). Firestore database id: `imprint`.
