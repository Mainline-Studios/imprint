import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { YourColors } from "../inspector/ColorField";
import { DEFAULT_BRAND } from "../lib/fill";
import { buildBackup } from "../persist/backup";
import { downloadBlob, slug } from "../export/renderPage";
import { useDocumentStore } from "../store/document";
import { SIZE_PRESETS, presetGroup } from "../templates/presets";
import { DesignCard } from "./DesignCard";
import type { Design, SizePreset } from "../types";

type KindFilter = "all" | SizePreset["group"] | "custom";
type SortId = "recent" | "name" | "size";
type PileFilter = "all" | "unfiled" | string;

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "social", label: "Social" },
  { id: "presentation", label: "Slides" },
  { id: "print", label: "Print" },
  { id: "site", label: "Sites" },
  { id: "email", label: "Email" },
  { id: "custom", label: "Custom" },
];

const QUICK_MAKES = ["ig-post", "ig-story", "presentation", "website"] as const;

export function ProfileScreen({ piles }: { piles: string[] }) {
  const { user, error, signInGoogle, signOutUser } = useAuth();
  const designs = useDocumentStore((s) => s.designs);
  const assets = useDocumentStore((s) => s.assets);
  const brandDefaults = useDocumentStore((s) => s.brandDefaults);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [pile, setPile] = useState<PileFilter>("all");
  const [sort, setSort] = useState<SortId>("recent");
  const [status, setStatus] = useState<string | null>(null);
  const [storageLabel, setStorageLabel] = useState("This browser");
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const photoRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const name = user?.displayName?.trim() || user?.email || "On this device";
  const photo = user?.photoURL;
  const email = user?.email;
  const mark = user ? initials(name) : "I";
  const pageCount = useMemo(() => designs.reduce((n, d) => n + d.pages.length, 0), [designs]);
  const latest = designs[0]?.updatedAt;
  const usedIds = useMemo(() => usedAssetIds(designs), [designs]);

  const visible = useMemo(() => {
    const next = designs.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q)) return false;
      if (kind !== "all" && presetGroup(d.width, d.height) !== kind) return false;
      if (pile === "unfiled" && d.folder) return false;
      if (pile !== "all" && pile !== "unfiled" && d.folder !== pile) return false;
      return true;
    });
    if (sort === "name") next.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "size") next.sort((a, b) => b.width * b.height - a.width * a.height);
    else next.sort((a, b) => b.updatedAt - a.updatedAt);
    return next;
  }, [designs, q, kind, pile, sort]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const a of assets) next[a.id] = URL.createObjectURL(a.blob);
    setAssetUrls(next);
    return () => {
      for (const u of Object.values(next)) URL.revokeObjectURL(u);
    };
  }, [assets]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const estimate = await navigator.storage?.estimate?.();
      if (cancelled || !estimate?.usage) return;
      const used = formatBytes(estimate.usage);
      setStorageLabel(used);
    })();
    return () => {
      cancelled = true;
    };
  }, [designs, assets]);

  function flash(message: string) {
    setStatus(message);
    window.setTimeout(() => setStatus((cur) => (cur === message ? null : cur)), 2400);
  }

  async function onBackup() {
    try {
      const blob = await buildBackup(designs, assets, brandDefaults);
      downloadBlob(blob, `${slug(name || "imprint")}-backup.json`);
      flash("Backup downloaded");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not build a backup.");
    }
  }

  async function onRestore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const result = await useDocumentStore.getState().importBackup(file);
      flash(`Restored ${result.designs} designs · ${result.assets} photos`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not restore that file.");
    }
  }

  function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void useDocumentStore.getState().createFromImageFile(file);
  }

  async function onDeleteAsset(id: string, assetName: string) {
    const used = usedIds.has(id);
    const ok = window.confirm(
      used
        ? `“${assetName}” is in a design. Remove it from the library anyway?`
        : `Remove “${assetName}” from the library?`,
    );
    if (!ok) return;
    await useDocumentStore.getState().deleteAsset(id);
  }

  return (
    <div className="profile-page">
      <header className="profile-head">
        {photo ? (
          <img className="profile-avatar" src={photo} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="profile-avatar fallback">{mark}</span>
        )}
        <div className="profile-identity">
          <p className="profile-kicker">Profile</p>
          <h1>{name}</h1>
          <p className="profile-meta">
            {user
              ? [email, user ? "Google account" : null].filter(Boolean).join(" · ")
              : "Work stays in this browser until you sign in."}
          </p>
        </div>
        <div className="profile-actions">
          {user ? (
            <button type="button" className="btn-secondary" onClick={() => void signOutUser()}>
              Sign out
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={() => void signInGoogle()}>
              Sign in with Google
            </button>
          )}
        </div>
      </header>
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}

      <ul className="profile-stats">
        <li>
          <strong>{designs.length}</strong>
          <span>{designs.length === 1 ? "Design" : "Designs"}</span>
        </li>
        <li>
          <strong>{pageCount}</strong>
          <span>{pageCount === 1 ? "Page" : "Pages"}</span>
        </li>
        <li>
          <strong>{assets.length}</strong>
          <span>{assets.length === 1 ? "Photo" : "Photos"}</span>
        </li>
        <li>
          <strong>{latest ? compactEdited(latest) : "—"}</strong>
          <span>Last edit</span>
        </li>
        <li>
          <strong>{storageLabel}</strong>
          <span>On this device</span>
        </li>
      </ul>

      <div className="profile-toolbar">
        {QUICK_MAKES.map((id) => {
          const preset = SIZE_PRESETS.find((p) => p.id === id);
          if (!preset) return null;
          return (
            <button
              key={id}
              type="button"
              className="btn-secondary"
              onClick={() => void useDocumentStore.getState().createBlank(preset.width, preset.height, preset.name)}
            >
              New {preset.name.replace(" 16:9", "")}
            </button>
          );
        })}
        <button type="button" className="btn-secondary" onClick={() => photoRef.current?.click()}>
          New from photo
        </button>
        <button type="button" className="btn-secondary" onClick={() => void onBackup()}>
          Download backup
        </button>
        <button type="button" className="btn-secondary" onClick={() => backupRef.current?.click()}>
          Restore backup
        </button>
        <input ref={photoRef} type="file" accept="image/*" hidden onChange={onUpload} />
        <input ref={backupRef} type="file" accept="application/json,.json" hidden onChange={(e) => void onRestore(e)} />
      </div>
      {status && (
        <p className="profile-status" role="status">
          {status}
        </p>
      )}

      <section className="profile-colors">
        <p className="profile-lead">Swatches land on new designs. They follow this account when you are signed in.</p>
        <YourColors
          colors={brandDefaults}
          onChange={(colors) => void useDocumentStore.getState().setBrandDefaults(colors)}
        />
        {brandDefaults.length > 0 && (
          <button
            type="button"
            className="profile-link"
            onClick={() => void useDocumentStore.getState().setBrandDefaults([...DEFAULT_BRAND])}
          >
            Restore paper swatches
          </button>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>Designs</h2>
          <div className="profile-design-tools">
            <label className="profile-search">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search designs"
                aria-label="Search designs"
              />
            </label>
            <select
              className="profile-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              aria-label="Sort designs"
            >
              <option value="recent">Recent</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </div>
        </div>
        <div className="pile-row">
          {KIND_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={kind === item.id ? "pile-chip on" : "pile-chip"}
              onClick={() => setKind(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="pile-row">
          <button type="button" className={pile === "all" ? "pile-chip on" : "pile-chip"} onClick={() => setPile("all")}>
            All piles
          </button>
          <button
            type="button"
            className={pile === "unfiled" ? "pile-chip on" : "pile-chip"}
            onClick={() => setPile("unfiled")}
          >
            Unfiled
          </button>
          {piles
            .filter((item) => designs.some((d) => d.folder === item))
            .map((item) => (
            <button
              key={item}
              type="button"
              className={pile === item ? "pile-chip on" : "pile-chip"}
              onClick={() => setPile(item)}
              onDoubleClick={() => {
                const next = window.prompt("Rename pile", item)?.trim();
                if (next) void useDocumentStore.getState().renameFolder(item, next);
              }}
            >
              {item}
              <em>{designs.filter((d) => d.folder === item).length}</em>
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="home-muted">{q || kind !== "all" || pile !== "all" ? "Nothing matches those filters." : "New work will show up here."}</p>
        ) : (
          <div className="home-row wrap">
            {visible.map((d) => (
              <DesignCard key={d.id} design={d} piles={piles} />
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2>Photos</h2>
          <button type="button" className="home-see-all" onClick={() => photoRef.current?.click()}>
            Upload
          </button>
        </div>
        {assets.length === 0 ? (
          <p className="home-muted">Uploads from the editor land here. Open one to start a design the same size as the photo.</p>
        ) : (
          <div className="profile-uploads">
            {assets.map((asset) => (
              <article key={asset.id} className="profile-upload">
                <button
                  type="button"
                  className="profile-upload-thumb"
                  onClick={() => void useDocumentStore.getState().createFromAsset(asset.id)}
                  title={`Start a design from ${asset.name}`}
                >
                  {assetUrls[asset.id] ? <img src={assetUrls[asset.id]} alt="" /> : <span />}
                </button>
                <div className="profile-upload-meta">
                  <strong>{asset.name}</strong>
                  <span>
                    {formatBytes(asset.blob.size)}
                    {usedIds.has(asset.id) ? " · In a design" : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${asset.name}`}
                  onClick={() => void onDeleteAsset(asset.id, asset.name)}
                >
                  ×
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function usedAssetIds(designs: Design[]): Set<string> {
  const ids = new Set<string>();
  for (const d of designs) {
    for (const page of d.pages) {
      for (const obj of page.objects) if (obj.type === "image") ids.add(obj.assetId);
    }
  }
  return ids;
}

function compactEdited(ts: number): string {
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 45) return "Just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} da`;
  const mo = Math.round(day / 30);
  return `${mo} mo`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "I") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase();
}
