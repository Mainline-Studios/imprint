import { useMemo, useState, type ChangeEvent } from "react";
import { MiniPreview } from "../canvas/MiniPreview";
import { useDocumentStore } from "../store/document";
import { SIZE_PRESETS, presetLabel } from "../templates/presets";
import { TEMPLATES } from "../templates/catalog";
import type { SizePreset, TemplateDef } from "../types";

export type CreateNavId =
  | "foryou"
  | "presentation"
  | "social"
  | "print"
  | "tshirt"
  | "site"
  | "email"
  | "custom"
  | "upload";

const NAV: { id: CreateNavId; label: string; color: string }[] = [
  { id: "foryou", label: "For you", color: "#7a2e2e" },
  { id: "presentation", label: "Presentations", color: "#c45c26" },
  { id: "social", label: "Social media", color: "#b42318" },
  { id: "print", label: "Print", color: "#2f4a3c" },
  { id: "tshirt", label: "T-shirt", color: "#1e2d3d" },
  { id: "site", label: "Site", color: "#7a2e2e" },
  { id: "email", label: "Email", color: "#5c3d2e" },
  { id: "custom", label: "Custom size", color: "#6b645c" },
  { id: "upload", label: "Upload", color: "#3f3833" },
];

const POPULAR_IDS = ["presentation", "ig-post", "letter", "a4", "website", "email", "tshirt"] as const;

export function TemplatesScreen({
  query,
  onQuery,
  nav,
  onNav,
  onUpload,
}: {
  query: string;
  onQuery: (value: string) => void;
  nav: CreateNavId;
  onNav: (id: CreateNavId) => void;
  onUpload: (file: File) => void;
}) {
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1080);
  const q = query.trim().toLowerCase();

  const sizes = useMemo(() => sizesFor(nav), [nav]);
  const templates = useMemo(() => {
    return TEMPLATES.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return templateMatchesNav(t, nav);
    });
  }, [nav, q]);

  function pickNav(id: CreateNavId) {
    if (id === "upload") {
      onNav(id);
      return;
    }
    onNav(id);
  }

  return (
    <div className="create-screen">
      <nav className="create-nav" aria-label="Create a design">
        <h1>Create a design</h1>
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={nav === item.id ? "create-nav-item active" : "create-nav-item"}
            onClick={() => pickNav(item.id)}
          >
            <span className="create-nav-dot" style={{ background: item.color }} aria-hidden />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="create-body">
        <label className="home-search create-search">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="What would you like to make?"
            aria-label="Search sizes and templates"
          />
        </label>

        <p className="create-lead">
          {nav === "site"
            ? "Start a webpage. Add buttons that open links, then export as HTML."
            : nav === "email"
              ? "Make a newsletter. Add a button, then Export → Open site or Download HTML."
              : nav === "tshirt"
                ? "Front, back, and shoulders — pick a color, then design each side."
                : "Pick a size to start blank, or open a template."}
        </p>

        {nav === "upload" ? (
          <label className="create-upload">
            <input
              type="file"
              accept="image/*"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onUpload(file);
              }}
            />
            <strong>Upload a photo</strong>
            <span>We’ll put it on a page the same size as the image.</span>
          </label>
        ) : null}

        {nav === "custom" ? (
          <section className="create-section">
            <h2>Custom size</h2>
            <div className="create-custom">
              <label>
                Width
                <input
                  type="number"
                  min={64}
                  max={8192}
                  value={customW}
                  onChange={(e) => setCustomW(Number(e.target.value))}
                />
              </label>
              <span>×</span>
              <label>
                Height
                <input
                  type="number"
                  min={64}
                  max={8192}
                  value={customH}
                  onChange={(e) => setCustomH(Number(e.target.value))}
                />
              </label>
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  void useDocumentStore.getState().createBlank(
                    Math.max(64, customW || 1080),
                    Math.max(64, customH || 1080),
                    "Custom",
                  )
                }
              >
                Create
              </button>
            </div>
          </section>
        ) : nav === "upload" ? null : (
          <section className="create-section">
            <h2>{nav === "foryou" ? "Popular sizes" : "Sizes"}</h2>
            <div className="size-cards">
              {sizes.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="size-card"
                  onClick={() => void useDocumentStore.getState().createBlank(preset.width, preset.height, preset.name)}
                >
                  <span className="size-card-art">
                    <span className="size-card-sheet" style={{ aspectRatio: `${preset.width} / ${preset.height}` }}>
                      <SizeArt id={preset.id} />
                    </span>
                  </span>
                  <strong>{preset.name}</strong>
                </button>
              ))}
            </div>
          </section>
        )}

        {nav === "site" ? (
          <section className="create-section">
            <h2>How a site works</h2>
            <ol className="create-steps">
              <li>Open Website (or a Site template).</li>
              <li>Click the button, then type a web address on the right — like your-shop.com.</li>
              <li>Export → Webpage (HTML). Open the file in a browser.</li>
            </ol>
          </section>
        ) : null}

        {nav === "tshirt" ? (
          <section className="create-section">
            <h2>How a T-shirt works</h2>
            <ol className="create-steps">
              <li>Open a blank tee or a template.</li>
              <li>Pick a shirt color in the preview on the right.</li>
              <li>Switch Front, Back, and shoulders in the strip below the canvas, then export PNG or PDF.</li>
            </ol>
          </section>
        ) : null}

        {nav === "email" ? (
          <section className="create-section">
            <h2>How email works</h2>
            <ol className="create-steps">
              <li>Open Email (or a newsletter template).</li>
              <li>Click the button, then choose where it goes — a website or an email address.</li>
              <li>Export → Open site or Download HTML. Open the file in a browser, or send it later.</li>
            </ol>
          </section>
        ) : null}

        {templates.length > 0 && nav !== "custom" && nav !== "upload" ? (
          <section className="create-section">
            <h2>{q ? "Templates" : nav === "foryou" ? "Try a template" : "Templates"}</h2>
            <div className="create-tpl-grid">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function sizesFor(nav: CreateNavId): SizePreset[] {
  if (nav === "foryou") {
    return POPULAR_IDS.map((id) => SIZE_PRESETS.find((p) => p.id === id)).filter((p): p is SizePreset => p != null);
  }
  if (nav === "tshirt") return SIZE_PRESETS.filter((p) => p.id === "tshirt" || p.id === "tshirt-wide");
  if (nav === "custom" || nav === "upload") return [];
  return SIZE_PRESETS.filter((p) => p.group === nav);
}

function templateMatchesNav(template: TemplateDef, nav: CreateNavId): boolean {
  if (nav === "foryou" || nav === "custom" || nav === "upload") return true;
  if (nav === "tshirt") {
    return SIZE_PRESETS.some(
      (p) => (p.id === "tshirt" || p.id === "tshirt-wide") && p.width === template.width && p.height === template.height,
    );
  }
  return template.category === nav;
}

function TemplateCard({ template }: { template: TemplateDef }) {
  const pages = useMemo(() => template.build(), [template]);
  const page = pages[0];
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
        {pages.length > 1 ? ` · ${pages.length} pages` : ""}
      </span>
    </button>
  );
}

function SizeArt({ id }: { id: string }) {
  if (id === "presentation" || id === "website" || id === "website-wide" || id === "yt-thumb" || id === "x-post") {
    return (
      <span className="size-art landscape">
        <span className="size-art-bar wide" />
        <span className="size-art-bar" />
        <span className="size-art-block" />
      </span>
    );
  }
  if (id === "ig-story" || id === "tshirt") {
    return (
      <span className="size-art portrait">
        <span className="size-art-circle" />
        <span className="size-art-bar" />
      </span>
    );
  }
  if (id === "letter" || id === "a4" || id === "letter-landscape" || id === "email" || id === "email-long") {
    return (
      <span className="size-art doc">
        <span className="size-art-mark" />
        <span className="size-art-bar wide" />
        <span className="size-art-bar" />
        <span className="size-art-bar" />
      </span>
    );
  }
  return (
    <span className="size-art square">
      <span className="size-art-bar wide" />
      <span className="size-art-block round" />
    </span>
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
