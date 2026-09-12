import { useAuth } from "./AuthProvider";

type Variant = "rail" | "hero" | "topbar";

export function AccountMenu({ variant }: { variant: Variant }) {
  const { user, ready, error, signInGoogle, signOutUser } = useAuth();

  if (!ready) return variant === "rail" ? <div className="home-rail-account" /> : null;

  if (!user) {
    if (variant === "topbar") {
      return (
        <div className="account-cluster">
          <button type="button" className="btn-secondary account-signin" onClick={() => void signInGoogle()}>
            Sign in
          </button>
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
        </div>
      );
    }
    if (variant === "rail") {
      return (
        <div className="home-rail-account">
          <button
            type="button"
            className="home-rail-btn"
            onClick={() => void signInGoogle()}
            aria-label="Sign in with Google"
            title={error ?? "Sign in with Google"}
          >
            <GoogleMark />
            <span>Sign in</span>
          </button>
          {error && (
            <p className="account-error rail" role="alert">
              {error}
            </p>
          )}
        </div>
      );
    }
    return (
      <div className="home-hero-auth">
        <button type="button" className="google-btn" onClick={() => void signInGoogle()}>
          <GoogleMark />
          Sign in with Google
        </button>
        {error && (
          <p className="account-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const name = user.displayName?.trim() || user.email || "Signed in";
  const photo = user.photoURL;

  if (variant === "rail") {
    return (
      <div className="home-rail-account">
        <button type="button" className="home-rail-btn" onClick={() => void signOutUser()} title={`${name} — Sign out`}>
          {photo ? <img className="account-avatar" src={photo} alt="" referrerPolicy="no-referrer" /> : <span className="account-avatar fallback">{initials(name)}</span>}
          <span>Sign out</span>
        </button>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <p className="home-hero-account">
        Signed in as {name}. Designs save to this Google account.
      </p>
    );
  }

  return (
    <div className="account-cluster">
      {photo ? <img className="account-avatar" src={photo} alt="" referrerPolicy="no-referrer" /> : <span className="account-avatar fallback">{initials(name)}</span>}
      <span className="account-name" title={name}>
        {name}
      </span>
      <button type="button" className="icon-btn" onClick={() => void signOutUser()}>
        Sign out
      </button>
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "I") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase();
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        opacity="0.9"
      />
      <path
        fill="currentColor"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        opacity="0.75"
      />
      <path
        fill="currentColor"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
        opacity="0.6"
      />
      <path
        fill="currentColor"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
        opacity="0.8"
      />
    </svg>
  );
}
