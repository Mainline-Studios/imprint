import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { MiniPreview } from "../canvas/MiniPreview";
import { useDocumentStore } from "../store/document";
import { SIZE_PRESETS, presetLabel } from "../templates/presets";
import { TEMPLATES } from "../templates/catalog";
import { AccountMenu } from "../auth/AccountMenu";
import { useAuth } from "../auth/AuthProvider";
import { TemplatesScreen, type CreateNavId } from "./TemplatesScreen";
import type { Design, TemplateDef } from "../types";

type HeroTab = "home" | "templates";
type CategoryId = "templates" | "presentation" | "social" | "print" | "site" | "email" | "custom" | "upload";
type SizeGroup = "social" | "presentation" | "print" | "site" | "email";

const CATEGORIES: { id: CategoryId; label: string; color: string }[] = [
  { id: "templates", label: "Templates", color: "#7a2e2e" },
  { id: "presentation", label: "Presentation", color: "#f97316" },
  { id: "social", label: "Social media", color: "#ef4444" },
  { id: "print", label: "Print", color: "#14b8a6" },
  { id: "site", label: "Site", color: "#7a2e2e" },
  { id: "email", label: "Email", color: "#5c3d2e" },
  { id: "custom", label: "Custom size", color: "#64748b" },
  { id: "upload", label: "Upload", color: "#0ea5e9" },
];

export function Home() {
  const { user } = useAuth();
  const designs = useDocumentStore((s) => s.designs);
  const [query, setQuery] = useState("");
  const [heroTab, setHeroTab] = useState<HeroTab>("home");
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [createNav, setCreateNav] = useState<CreateNavId>("foryou");
  const [recentsExpanded, setRecentsExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const templatesRef = useRef<HTMLElement>(null);

  useEffect(() => {
    void useDocumentStore.getState().loadHome();
  }, []);

  const q = query.trim().toLowerCase();
  const sizeGroup: SizeGroup | null =
    category === "social" ||
    category === "presentation" ||
    category === "print" ||
    category === "site" ||
    category === "email"
      ? category
      : null;

  const filteredDesigns = useMemo(() => {
    return designs.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q)) return false;
      if (sizeGroup && !designMatchesGroup(d, sizeGroup)) return false;
      return true;
    });
  }, [designs, q, sizeGroup]);

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (sizeGroup && t.category !== sizeGroup) return false;
      return true;
    });
  }, [q, sizeGroup]);

  function openCreateScreen(nav: CreateNavId = "foryou") {
    setCreateNav(nav);
    setHeroTab("templates");
    setCategory(nav === "foryou" ? "templates" : nav === "tshirt" ? "print" : nav === "upload" ? "upload" : nav);
  }

  function onCategory(id: CategoryId) {
    if (id === "upload") {
      fileRef.current?.click();
      return;
    }
    if (id === "custom") {
      openCreateScreen("custom");
      return;
    }
    if (id === "templates") {
      openCreateScreen("foryou");
      return;
    }
    openCreateScreen(id);
  }

  function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void useDocumentStore.getState().createFromImageFile(file);
  }

  const showRecents = heroTab === "home";

  return (
    <div className="home">
      <nav className="home-rail" aria-label="Home">
        <div className="home-rail-mark" aria-hidden>
          I
        </div>
        <button type="button" className="home-rail-create" onClick={() => openCreateScreen("foryou")} aria-label="Create">
          <PlusIcon />
          <span>Create</span>
        </button>
        <button
          type="button"
          className={heroTab === "home" ? "home-rail-btn active" : "home-rail-btn"}
          onClick={() => {
            setHeroTab("home");
            setCategory(null);
            stageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <HomeIcon />
          <span>Home</span>
        </button>
        <button
          type="button"
          className={heroTab === "templates" ? "home-rail-btn active" : "home-rail-btn"}
          onClick={() => {
            setHeroTab("templates");
            setCreateNav("foryou");
            setCategory("templates");
          }}
        >
          <GridIcon />
          <span>Templates</span>
        </button>
        <AccountMenu variant="rail" />
      </nav>

      <div className="home-stage" ref={stageRef}>
        {heroTab === "templates" ? (
          <TemplatesScreen
            query={query}
            onQuery={setQuery}
            nav={createNav}
            onNav={(id) => {
              if (id === "upload") {
                fileRef.current?.click();
                return;
              }
              setCreateNav(id);
            }}
            onUpload={(file) => void useDocumentStore.getState().createFromImageFile(file)}
          />
        ) : (
          <>
        <header className="home-hero">
          <h1 className="home-hero-title">Leave a mark.</h1>
          <p className="home-hero-sub">
            {user
              ? "Paper, type, and work that follows your Google account."
              : "Paper, type, and work that stays on this device. Sign in to keep designs with your account."}
          </p>
          <AccountMenu variant="hero" />
          <div className="home-hero-tabs" role="tablist" aria-label="Home sections">
            <button
              type="button"
              role="tab"
              aria-selected
              className="active"
              onClick={() => setHeroTab("home")}
            >
              Home
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={false}
              onClick={() => openCreateScreen("foryou")}
            >
              Templates
            </button>
          </div>
          <label className="home-search">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything"
              aria-label="Search designs and templates"
            />
          </label>
          <div className="home-cats" role="list">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="listitem"
                className={category === cat.id ? "home-cat active" : "home-cat"}
                onClick={() => onCategory(cat.id)}
              >
                <span className="home-cat-icon" style={{ background: cat.color }} aria-hidden>
                  <CategoryMark id={cat.id} />
                </span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </header>

        <main className="home-main">
          {showRecents && (
            <section className="home-section">
              <div className="home-section-head">
                <h2>{q ? "Designs" : "Continue designing"}</h2>
                {filteredDesigns.length > 4 && (
                  <button type="button" className="home-see-all" onClick={() => setRecentsExpanded((v) => !v)}>
                    {recentsExpanded ? "Show less" : "See all"}
                  </button>
                )}
              </div>
              {filteredDesigns.length === 0 ? (
                <p className="home-muted">
                  {q ? `No designs match “${query.trim()}”.` : "Your recent work will show up here."}
                </p>
              ) : (
                <div className={recentsExpanded ? "home-row wrap" : "home-row"}>
                  {filteredDesigns.map((d) => (
                    <DesignCard key={d.id} design={d} />
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="home-section" ref={templatesRef} id="home-templates">
            <div className="home-section-head">
              <h2>{q ? "Templates" : "Templates for you"}</h2>
              <button type="button" className="home-see-all" onClick={() => openCreateScreen(sizeGroup ?? "foryou")}>
                See all
              </button>
            </div>
            {filteredTemplates.length === 0 ? (
              <p className="home-muted">No templates match{query.trim() ? ` “${query.trim()}”` : ""}.</p>
            ) : (
              <div className="home-row">
                {filteredTemplates.map((t) => (
                  <TemplateCard key={t.id} template={t} />
                ))}
              </div>
            )}
          </section>
        </main>
          </>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
    </div>
  );
}

function designMatchesGroup(design: Design, group: SizeGroup): boolean {
  return SIZE_PRESETS.some((p) => p.group === group && p.width === design.width && p.height === design.height);
}

function relativeEdited(ts: number): string {
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 45) return "Edited just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `Edited ${min} m.`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `Edited ${hr} hr.`;
  const day = Math.round(hr / 24);
  if (day < 30) return `Edited ${day} da.`;
  const mo = Math.round(day / 30);
  return `Edited ${mo} month${mo === 1 ? "" : "s"}.`;
}

function DesignCard({ design }: { design: Design }) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const page = design.pages[0];

  useEffect(() => {
    if (!menu) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setMenu(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  return (
    <article className="design-card">
      <button
        type="button"
        className="design-thumb"
        onClick={() => void useDocumentStore.getState().openDesign(design.id)}
      >
        {page && (
          <MiniPreview width={design.width} height={design.height} background={page.background} objects={page.objects} />
        )}
      </button>
      <div className="design-meta">
        {renaming ? (
          <input
            className="rename-input"
            defaultValue={design.name}
            autoFocus
            onBlur={(e) => {
              const name = e.target.value.trim() || "Untitled";
              void useDocumentStore.getState().renameListed(design.id, name);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(false);
            }}
          />
        ) : (
          <button type="button" className="design-name" onClick={() => void useDocumentStore.getState().openDesign(design.id)}>
            {design.name}
          </button>
        )}
        <div className="design-sub">
          <span>
            {presetLabel(design.width, design.height)} · {relativeEdited(design.updatedAt)}
          </span>
          <div className="card-menu-wrap" ref={wrapRef}>
            <button type="button" className="icon-btn" aria-label="Design menu" onClick={() => setMenu((v) => !v)}>
              ···
            </button>
            {menu && (
              <div className="menu" role="menu">
                <button
                  type="button"
                  onClick={() => {
                    setRenaming(true);
                    setMenu(false);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void useDocumentStore.getState().duplicateDesign(design.id);
                    setMenu(false);
                  }}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    void useDocumentStore.getState().deleteDesign(design.id);
                    setMenu(false);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function TemplateCard({ template }: { template: TemplateDef }) {
  const page = useMemo(() => template.build()[0], [template]);
  return (
    <button
      type="button"
      className="home-tpl-card"
      onClick={() => void useDocumentStore.getState().createFromTemplate(template.id)}
    >
      <span className="home-tpl-thumb-wrap">
        {page && (
          <MiniPreview width={template.width} height={template.height} background={page.background} objects={page.objects} />
        )}
      </span>
      <strong>{template.name}</strong>
      <span className="home-tpl-sub">
        {presetLabel(template.width, template.height, template.category)}
        {template.id === "keynote-deck" ? " · 3 pages" : ""}
      </span>
    </button>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CategoryMark({ id }: { id: CategoryId }) {
  if (id === "templates") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22">
        <rect x="4" y="4" width="7" height="7" rx="1.6" fill="currentColor" opacity="0.95" />
        <rect x="13" y="4" width="7" height="7" rx="1.6" fill="currentColor" opacity="0.7" />
        <rect x="4" y="13" width="7" height="7" rx="1.6" fill="currentColor" opacity="0.7" />
        <rect x="13" y="13" width="7" height="7" rx="1.6" fill="currentColor" opacity="0.45" />
      </svg>
    );
  }
  if (id === "presentation") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22">
        <rect x="4" y="6" width="16" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 20h8M12 17v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10 10.5v4l4-2z" fill="currentColor" />
      </svg>
    );
  }
  if (id === "social") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M12 18.2 6.4 12.8a3.4 3.4 0 0 1 4.8-4.8L12 9l.8-1a3.4 3.4 0 0 1 4.8 4.8z" fill="currentColor" />
      </svg>
    );
  }
  if (id === "print") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path
          d="M7 9V5h10v4M7 15H5a2 2 0 0 1-2-2V9h18v4a2 2 0 0 1-2 2h-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <rect x="7" y="13" width="10" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (id === "custom") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path
          d="M8 5H5v3M16 5h3v3M8 19H5v-3M16 19h3v-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <rect x="8" y="8" width="8" height="8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (id === "site") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22">
        <rect x="3.5" y="5" width="17" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3.5 9h17M8 5v14" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (id === "email") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22">
        <rect x="3.5" y="6" width="17" height="12" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M4 7.2 12 13l8-5.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path d="M12 16V5M12 5l-3.5 3.5M12 5l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
