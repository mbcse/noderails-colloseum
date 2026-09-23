const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const CAMPAIGN_CTA_CSS_PROPS = [
  'background-color',
  'color',
  'border',
  'border-color',
  'border-width',
  'border-style',
  'border-radius',
  'padding',
  'font-size',
  'font-weight',
  'letter-spacing',
  'text-decoration',
] as const;

const ALLOWED_PROP = new Set<string>(CAMPAIGN_CTA_CSS_PROPS);

const BANNED = /url\s*\(|expression\s*\(|behavior\s*:|position\s*:|javascript:|@import|<\/?script/i;

const VALUE_OK = /^(?:[#0-9a-zA-Z.%+\-\s,/()]+)$/;

export function isCampaignHexColor(value: string): boolean {
  return HEX.test(value.trim());
}

export function normalizeCampaignHexColor(value: string | undefined | null, fallback: string): string {
  const raw = value?.trim() ?? '';
  return isCampaignHexColor(raw) ? raw : fallback;
}

/** Keep only allowlisted CSS declarations. Drops url(), expression, position, behavior. */
export function sanitizeCampaignCtaCss(raw: string | undefined | null): string {
  if (!raw?.trim()) return '';
  const parts = raw.split(';');
  const kept: string[] = [];
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx < 1) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (!ALLOWED_PROP.has(prop) || !value) continue;
    if (BANNED.test(value) || !VALUE_OK.test(value)) continue;
    if (value.length > 80) continue;
    kept.push(`${prop}:${value}`);
  }
  return kept.join(';');
}

const SVG_ALLOWED_TAGS = new Set(['svg', 'path', 'circle', 'line', 'polyline', 'polygon', 'rect', 'g']);

/** Inline SVG snapshot for email. Only basic shape tags; no events or links. */
export function sanitizeCampaignCtaSvg(raw: string | undefined | null): string {
  if (!raw?.trim()) return '';
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith('<svg')) return '';
  if (/on[a-z]+\s*=|<script|<a[\s>]|javascript:|xlink:href/i.test(trimmed)) return '';
  if (trimmed.length > 4000) return '';

  const withoutComments = trimmed.replace(/<!--[\s\S]*?-->/g, '');
  const tags = [...withoutComments.matchAll(/<\/?([a-zA-Z0-9:-]+)/g)].map((m) => m[1].toLowerCase());
  if (!tags.length || tags.some((tag) => !SVG_ALLOWED_TAGS.has(tag))) return '';

  return withoutComments
    .replace(/\s(width|height)="[^"]*"/gi, '')
    .replace('<svg', '<svg width="16" height="16"');
}

export function sanitizeCampaignCtaIconName(raw: string | undefined | null): string {
  const name = raw?.trim() ?? '';
  if (!/^[A-Z][A-Za-z0-9]{0,47}$/.test(name)) return '';
  return name;
}
