const PAGE_LINK = /^#page-(\d+)$/i;

export function pageHref(pageNumber: number): string {
  return `#page-${pageNumber}`;
}

export function pageIndexFromHref(href: string): number | null {
  const match = PAGE_LINK.exec(href.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n >= 1 ? n - 1 : null;
}

export function normalizeHrefInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (isBlockedHref(trimmed)) return "";
  if (/^(https?:\/\/|mailto:|tel:|#)/i.test(trimmed)) return trimmed;
  if (looksLikeEmail(trimmed)) return `mailto:${trimmed}`;
  if (looksLikeDomain(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export function sanitizeHref(raw: string): string {
  const href = normalizeHrefInput(raw);
  if (!href || isBlockedHref(href)) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith("#")) return href;
  return "";
}

export function hrefKind(href: string): "page" | "web" | "mail" | "empty" {
  const trimmed = href.trim();
  if (pageIndexFromHref(trimmed) != null) return "page";
  if (/^mailto:/i.test(trimmed) || looksLikeEmail(trimmed)) return "mail";
  if (trimmed) return "web";
  return "empty";
}

export function mailtoHref(raw: string): string {
  const address = raw.trim().replace(/^mailto:/i, "").trim();
  return address ? `mailto:${address}` : "mailto:";
}

export function emailFromMailto(href: string): string {
  return href.trim().replace(/^mailto:/i, "").trim();
}

export function looksLikeEmail(value: string): boolean {
  const address = value.trim().replace(/^mailto:/i, "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
}

function isBlockedHref(value: string): boolean {
  return /^(javascript|data|vbscript|file):/i.test(value.trim());
}

function looksLikeDomain(value: string): boolean {
  return /^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(value);
}
