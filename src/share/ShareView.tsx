import { useEffect, useState } from "react";
import { MiniPreview } from "../canvas/MiniPreview";
import { cloneDesign } from "../lib/clone";
import { putAsset } from "../persist/db";
import { loadShare } from "../persist/share";
import { saveDesign } from "../persist/save";
import { useDocumentStore } from "../store/document";
import type { ShareSnapshot } from "../types";

export function ShareView({ token }: { token: string }) {
  const [snap, setSnap] = useState<ShareSnapshot | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadShare(token)
      .then((next) => {
        if (!cancelled) setSnap(next);
      })
      .catch(() => {
        if (!cancelled) {
          setSnap(null);
          setError("Could not open this link.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function remix() {
    if (!snap) return;
    for (const [id, url] of Object.entries(snap.assetUrls)) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const blob = await res.blob();
        await putAsset({
          id,
          blob,
          mime: blob.type || "image/jpeg",
          name: id,
          createdAt: Date.now(),
        });
      } catch {
        /* image may be missing */
      }
    }
    const copy = cloneDesign(
      {
        id: token,
        name: snap.name,
        width: snap.width,
        height: snap.height,
        pages: snap.pages,
        updatedAt: Date.now(),
      },
      snap.name,
    );
    await saveDesign(copy);
    await useDocumentStore.getState().openDesign(copy.id);
    window.location.hash = "";
  }

  if (snap === undefined) {
    return (
      <div className="share-view">
        <p className="home-muted">Opening…</p>
      </div>
    );
  }

  if (!snap) {
    return (
      <div className="share-view">
        <h1>Link not found</h1>
        <p className="home-muted">{error ?? "This share may have been removed."}</p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            window.location.hash = "";
          }}
        >
          Back to Imprint
        </button>
      </div>
    );
  }

  return (
    <div className="share-view">
      <header className="share-head">
        <div>
          <p className="share-kicker">View only</p>
          <h1>{snap.name}</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => void remix()}>
          Remix
        </button>
      </header>
      <p className="hint">Remix makes a copy you can edit on this device.</p>
      <div className="share-pages">
        {snap.pages.map((page, i) => (
          <MiniPreview
            key={page.id || i}
            className="share-page"
            width={snap.width}
            height={snap.height}
            background={page.background}
            objects={page.objects}
            assetSrc={(id) => snap.assetUrls[id]}
          />
        ))}
      </div>
    </div>
  );
}
