import { CAMPAIGN_EMAIL } from './campaign-brand.js';
import {
  isCampaignHexColor,
  normalizeCampaignHexColor,
  sanitizeCampaignCtaCss,
  sanitizeCampaignCtaIconName,
  sanitizeCampaignCtaSvg,
} from './campaign-cta-sanitize.js';

export const CAMPAIGN_CTA_STYLE_IDS = [
  'black_pill',
  'black_rect',
  'purple_fill',
  'purple_pill',
  'outline_dark',
  'outline_purple',
  'soft_gray',
  'navy_fill',
  'text_link',
  'text_underline',
  'ghost',
  'arrow_row',
] as const;

export type CampaignCtaStyleId = (typeof CAMPAIGN_CTA_STYLE_IDS)[number];

export const CAMPAIGN_CTA_PLACEMENTS = ['after_heading', 'after_body', 'before_signer'] as const;
export type CampaignCtaPlacement = (typeof CAMPAIGN_CTA_PLACEMENTS)[number];

export const CAMPAIGN_CTA_ALIGNS = ['left', 'center'] as const;
export type CampaignCtaAlign = (typeof CAMPAIGN_CTA_ALIGNS)[number];

export const CAMPAIGN_CTA_LAYOUTS = ['stack', 'row'] as const;
export type CampaignCtaLayout = (typeof CAMPAIGN_CTA_LAYOUTS)[number];

export const CAMPAIGN_CTA_SHAPES = ['square', 'rect', 'pill'] as const;
export type CampaignCtaShape = (typeof CAMPAIGN_CTA_SHAPES)[number];

export const CAMPAIGN_CTA_FILLS = ['solid', 'outline', 'text'] as const;
export type CampaignCtaFill = (typeof CAMPAIGN_CTA_FILLS)[number];

export const CAMPAIGN_CTA_ICON_POSITIONS = ['left', 'right'] as const;
export type CampaignCtaIconPosition = (typeof CAMPAIGN_CTA_ICON_POSITIONS)[number];

export const CAMPAIGN_CTA_MAX = 8;

export const CAMPAIGN_CTA_PALETTE = [
  '#000000',
  '#ffffff',
  '#0a2540',
  '#1d1d1f',
  '#425466',
  '#697386',
  '#e3e8ee',
  '#f6f9fc',
  '#4f46e5',
  '#635bff',
  '#7c3aed',
  '#2563eb',
  '#0ea5e9',
  '#14b8a6',
  '#059669',
  '#16a34a',
  '#d97706',
  '#ea580c',
  '#dc2626',
  '#e11d48',
  '#f5f5f7',
  '#eef2ff',
  '#ecfdf5',
  '#fff7ed',
] as const;

export interface CampaignCtaInput {
  id: string;
  label: string;
  url: string;
  placement: CampaignCtaPlacement;
  style: CampaignCtaStyleId;
  align?: CampaignCtaAlign;
  withArrow?: boolean;
  shape?: CampaignCtaShape;
  fill?: CampaignCtaFill;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  iconName?: string;
  iconSvg?: string;
  iconPosition?: CampaignCtaIconPosition;
  customCss?: string;
  row?: number;
}

export interface CampaignCtaStyleMeta {
  id: CampaignCtaStyleId;
  label: string;
  defaultAlign: CampaignCtaAlign;
  swatch: { bg: string; fg: string; border?: string; radius: string };
}

export const CAMPAIGN_CTA_STYLE_CATALOG: CampaignCtaStyleMeta[] = [
  { id: 'black_pill', label: 'Black pill', defaultAlign: 'center', swatch: { bg: '#000000', fg: '#ffffff', radius: '980px' } },
  { id: 'black_rect', label: 'Black rect', defaultAlign: 'center', swatch: { bg: '#000000', fg: '#ffffff', radius: '8px' } },
  { id: 'purple_fill', label: 'Purple fill', defaultAlign: 'center', swatch: { bg: '#635bff', fg: '#ffffff', radius: '8px' } },
  { id: 'purple_pill', label: 'Purple pill', defaultAlign: 'center', swatch: { bg: '#635bff', fg: '#ffffff', radius: '980px' } },
  { id: 'outline_dark', label: 'Outline dark', defaultAlign: 'left', swatch: { bg: '#ffffff', fg: '#1d1d1f', border: '#1d1d1f', radius: '8px' } },
  { id: 'outline_purple', label: 'Outline purple', defaultAlign: 'left', swatch: { bg: '#ffffff', fg: '#635bff', border: '#635bff', radius: '8px' } },
  { id: 'soft_gray', label: 'Soft gray', defaultAlign: 'left', swatch: { bg: '#f5f5f7', fg: '#1d1d1f', radius: '8px' } },
  { id: 'navy_fill', label: 'Navy fill', defaultAlign: 'center', swatch: { bg: '#0a2540', fg: '#ffffff', radius: '8px' } },
  { id: 'text_link', label: 'Text link', defaultAlign: 'left', swatch: { bg: '#ffffff', fg: '#635bff', radius: '4px' } },
  { id: 'text_underline', label: 'Text underline', defaultAlign: 'left', swatch: { bg: '#ffffff', fg: '#1d1d1f', radius: '4px' } },
  { id: 'ghost', label: 'Ghost', defaultAlign: 'left', swatch: { bg: '#ffffff', fg: '#1d1d1f', border: '#d2d2d7', radius: '8px' } },
  { id: 'arrow_row', label: 'Arrow row', defaultAlign: 'left', swatch: { bg: '#f5f5f7', fg: '#1d1d1f', radius: '8px' } },
];

export function isCampaignCtaStyleId(value: string): value is CampaignCtaStyleId {
  return (CAMPAIGN_CTA_STYLE_IDS as readonly string[]).includes(value);
}

export function isCampaignCtaPlacement(value: string): value is CampaignCtaPlacement {
  return (CAMPAIGN_CTA_PLACEMENTS as readonly string[]).includes(value);
}

export function isCampaignCtaLayout(value: string): value is CampaignCtaLayout {
  return (CAMPAIGN_CTA_LAYOUTS as readonly string[]).includes(value);
}

export function isCampaignCtaShape(value: string): value is CampaignCtaShape {
  return (CAMPAIGN_CTA_SHAPES as readonly string[]).includes(value);
}

export function isCampaignCtaFill(value: string): value is CampaignCtaFill {
  return (CAMPAIGN_CTA_FILLS as readonly string[]).includes(value);
}

export function defaultStyleForTemplate(templateId?: string | null): CampaignCtaStyleId {
  switch (templateId) {
    case 'EVENT_INVITE':
      return 'purple_fill';
    case 'BUSINESS_OUTREACH':
    case 'DIRECT_OUTREACH':
      return 'outline_dark';
    case 'ANNOUNCEMENT':
    case 'PARTNERSHIP':
    case 'FOLLOW_UP':
      return 'text_link';
    case 'UPDATES':
    default:
      return 'black_pill';
  }
}

export function radiusForShape(shape: CampaignCtaShape): string {
  if (shape === 'square') return '2px';
  if (shape === 'pill') return '999px';
  return '8px';
}

export interface CampaignCtaVisual {
  shape: CampaignCtaShape;
  fill: CampaignCtaFill;
  bgColor: string;
  textColor: string;
  borderColor: string;
  underline: boolean;
  forceArrow: boolean;
}

export function visualFromStyleId(style: CampaignCtaStyleId): CampaignCtaVisual {
  switch (style) {
    case 'black_pill':
      return { shape: 'pill', fill: 'solid', bgColor: '#000000', textColor: '#ffffff', borderColor: '#000000', underline: false, forceArrow: false };
    case 'black_rect':
      return { shape: 'rect', fill: 'solid', bgColor: '#000000', textColor: '#ffffff', borderColor: '#000000', underline: false, forceArrow: false };
    case 'purple_fill':
      return { shape: 'rect', fill: 'solid', bgColor: '#635bff', textColor: '#ffffff', borderColor: '#635bff', underline: false, forceArrow: false };
    case 'purple_pill':
      return { shape: 'pill', fill: 'solid', bgColor: '#635bff', textColor: '#ffffff', borderColor: '#635bff', underline: false, forceArrow: false };
    case 'outline_dark':
      return { shape: 'rect', fill: 'outline', bgColor: '#ffffff', textColor: '#1d1d1f', borderColor: '#1d1d1f', underline: false, forceArrow: false };
    case 'outline_purple':
      return { shape: 'rect', fill: 'outline', bgColor: '#ffffff', textColor: '#635bff', borderColor: '#635bff', underline: false, forceArrow: false };
    case 'soft_gray':
      return { shape: 'rect', fill: 'solid', bgColor: '#f5f5f7', textColor: '#1d1d1f', borderColor: '#f5f5f7', underline: false, forceArrow: false };
    case 'navy_fill':
      return { shape: 'rect', fill: 'solid', bgColor: '#0a2540', textColor: '#ffffff', borderColor: '#0a2540', underline: false, forceArrow: false };
    case 'text_link':
      return { shape: 'rect', fill: 'text', bgColor: '#ffffff', textColor: '#635bff', borderColor: '#635bff', underline: false, forceArrow: false };
    case 'text_underline':
      return { shape: 'rect', fill: 'text', bgColor: '#ffffff', textColor: '#1d1d1f', borderColor: '#1d1d1f', underline: true, forceArrow: false };
    case 'ghost':
      return { shape: 'rect', fill: 'outline', bgColor: '#ffffff', textColor: '#1d1d1f', borderColor: '#d2d2d7', underline: false, forceArrow: false };
    case 'arrow_row':
      return { shape: 'rect', fill: 'solid', bgColor: '#f5f5f7', textColor: '#1d1d1f', borderColor: '#f5f5f7', underline: false, forceArrow: true };
    default:
      return { shape: 'pill', fill: 'solid', bgColor: '#000000', textColor: '#ffffff', borderColor: '#000000', underline: false, forceArrow: false };
  }
}

export function resolveCampaignCtaVisual(cta: Pick<CampaignCtaInput, 'style' | 'shape' | 'fill' | 'bgColor' | 'textColor' | 'borderColor'>): CampaignCtaVisual {
  const fromStyle = isCampaignCtaStyleId(cta.style) ? visualFromStyleId(cta.style) : visualFromStyleId('black_pill');
  const fill = cta.fill && isCampaignCtaFill(cta.fill) ? cta.fill : fromStyle.fill;
  const shape = cta.shape && isCampaignCtaShape(cta.shape) ? cta.shape : fromStyle.shape;
  return {
    shape,
    fill,
    bgColor: normalizeCampaignHexColor(cta.bgColor, fromStyle.bgColor),
    textColor: normalizeCampaignHexColor(cta.textColor, fromStyle.textColor),
    borderColor: normalizeCampaignHexColor(cta.borderColor, fromStyle.borderColor),
    underline: fromStyle.underline && fill === 'text',
    forceArrow: fromStyle.forceArrow,
  };
}

export function resolveCampaignCtaRow(
  cta: Pick<CampaignCtaInput, 'row'>,
  index: number,
  layout: CampaignCtaLayout,
): number {
  if (typeof cta.row === 'number' && Number.isInteger(cta.row) && cta.row >= 1 && cta.row <= 20) {
    return cta.row;
  }
  return layout === 'row' ? 1 : index + 1;
}

export function normalizeCampaignCtaInput(raw: CampaignCtaInput, templateId?: string | null): CampaignCtaInput {
  const style = isCampaignCtaStyleId(raw.style) ? raw.style : defaultStyleForTemplate(templateId);
  const visual = resolveCampaignCtaVisual({ ...raw, style });
  const row = typeof raw.row === 'number' && Number.isInteger(raw.row) ? Math.min(20, Math.max(1, raw.row)) : undefined;
  return {
    id: raw.id,
    label: raw.label,
    url: raw.url,
    placement: isCampaignCtaPlacement(raw.placement) ? raw.placement : 'after_body',
    style,
    align: raw.align === 'center' || raw.align === 'left' ? raw.align : undefined,
    withArrow: Boolean(raw.withArrow),
    shape: visual.shape,
    fill: visual.fill,
    bgColor: visual.bgColor,
    textColor: visual.textColor,
    borderColor: visual.borderColor,
    iconName: sanitizeCampaignCtaIconName(raw.iconName) || undefined,
    iconSvg: sanitizeCampaignCtaSvg(raw.iconSvg) || undefined,
    iconPosition: raw.iconPosition === 'right' ? 'right' : raw.iconSvg || raw.iconName ? 'left' : undefined,
    customCss: sanitizeCampaignCtaCss(raw.customCss) || undefined,
    row,
  };
}

export interface RenderStyledCtaOptions {
  labelEscaped: string;
  hrefEscaped: string;
  style: CampaignCtaStyleId;
  align?: CampaignCtaAlign;
  withArrow?: boolean;
  cellPadding?: string;
  shape?: CampaignCtaShape;
  fill?: CampaignCtaFill;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  iconSvg?: string;
  iconPosition?: CampaignCtaIconPosition;
  customCss?: string;
}

function labelWithArrow(labelEscaped: string, withArrow: boolean, force = false): string {
  if (!withArrow && !force) return labelEscaped;
  return `${labelEscaped}&nbsp;&nbsp;<span style="font-weight:600;">&rarr;</span>`;
}

function iconHtml(svg: string | undefined, position: CampaignCtaIconPosition | undefined, textColor: string): { left: string; right: string } {
  if (!svg) return { left: '', right: '' };
  const colored = svg.includes('stroke=')
    ? svg
    : svg.replace('<svg', `<svg stroke="${textColor}" fill="none"`);
  const html = `<span style="display:inline-block;vertical-align:middle;line-height:0;width:16px;height:16px;">${colored}</span>`;
  if (position === 'right') return { left: '', right: `&nbsp;${html}` };
  return { left: `${html}&nbsp;`, right: '' };
}

function buttonInner(options: {
  labelEscaped: string;
  hrefEscaped: string;
  bg: string;
  fg: string;
  border?: string;
  radius: string;
  withArrow?: boolean;
  forceArrow?: boolean;
  iconSvg?: string;
  iconPosition?: CampaignCtaIconPosition;
  customCss?: string;
}): string {
  const border = options.border
    ? `border:1px solid ${options.border};`
    : `border:1px solid ${options.bg};`;
  const label = labelWithArrow(options.labelEscaped, Boolean(options.withArrow), options.forceArrow);
  const icons = iconHtml(options.iconSvg, options.iconPosition, options.fg);
  const extra = options.customCss ? `${options.customCss};` : '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" class="nr-cta" style="display:inline-block;">
                <tr>
                  <td align="center" style="border-radius:${options.radius};background-color:${options.bg};${border}">
                    <a href="${options.hrefEscaped}" class="nr-cta-link" style="display:inline-block;padding:12px 22px;font-family:${CAMPAIGN_EMAIL.font};font-size:15px;font-weight:500;color:${options.fg};text-decoration:none;letter-spacing:-0.01em;border-radius:${options.radius};${extra}">
                      ${icons.left}${label}${icons.right}
                    </a>
                  </td>
                </tr>
              </table>`;
}

function textInner(options: {
  labelEscaped: string;
  hrefEscaped: string;
  color: string;
  underline: boolean;
  withArrow?: boolean;
  iconSvg?: string;
  iconPosition?: CampaignCtaIconPosition;
  customCss?: string;
}): string {
  const deco = options.underline ? 'underline' : 'none';
  const label = labelWithArrow(options.labelEscaped, Boolean(options.withArrow));
  const icons = iconHtml(options.iconSvg, options.iconPosition, options.color);
  const extra = options.customCss ? `${options.customCss};` : '';
  return `<a href="${options.hrefEscaped}" class="nr-cta nr-cta-link" style="display:inline-block;font-family:${CAMPAIGN_EMAIL.font};font-size:15px;font-weight:500;color:${options.color};text-decoration:${deco};text-underline-offset:2px;padding:8px 4px;${extra}">
                ${icons.left}${label}${icons.right}
              </a>`;
}

function renderVisualInner(options: RenderStyledCtaOptions): string {
  const visual = resolveCampaignCtaVisual(options);
  const radius = radiusForShape(visual.shape);
  const css = sanitizeCampaignCtaCss(options.customCss);
  const svg = sanitizeCampaignCtaSvg(options.iconSvg);
  const base = {
    labelEscaped: options.labelEscaped,
    hrefEscaped: options.hrefEscaped,
    withArrow: options.withArrow,
    iconSvg: svg || undefined,
    iconPosition: options.iconPosition,
    customCss: css || undefined,
  };

  if (visual.fill === 'text') {
    return textInner({
      ...base,
      color: visual.textColor,
      underline: visual.underline,
    });
  }

  const bg = visual.fill === 'outline' ? (isCampaignHexColor(visual.bgColor) ? visual.bgColor : '#ffffff') : visual.bgColor;
  return buttonInner({
    ...base,
    bg,
    fg: visual.textColor,
    border: visual.borderColor,
    radius,
    forceArrow: visual.forceArrow,
  });
}

/** Inner button/link HTML only (no outer email row). */
export function renderStyledCampaignCtaInner(options: Omit<RenderStyledCtaOptions, 'align' | 'cellPadding'>): string {
  return renderVisualInner(options);
}

/** Render one CTA as a full email table row. */
export function renderStyledCampaignCta(options: RenderStyledCtaOptions): string {
  const align = options.align ?? CAMPAIGN_CTA_STYLE_CATALOG.find((s) => s.id === options.style)?.defaultAlign ?? 'left';
  const pad = options.cellPadding ?? '4px 48px 16px';
  const textAlign = align === 'center' ? 'center' : 'left';
  const tableAlign = align === 'center' ? ' align="center" style="margin:0 auto;"' : '';
  const inner = renderStyledCampaignCtaInner(options);
  return `
          <tr>
            <td style="padding:${pad};text-align:${textAlign};background-color:${CAMPAIGN_EMAIL.white};">
              <table role="presentation" cellpadding="0" cellspacing="0"${tableAlign}>
                <tr>
                  <td style="vertical-align:middle;">${inner}</td>
                </tr>
              </table>
            </td>
          </tr>`;
}

export interface PreparedCtaForLayout {
  labelEscaped: string;
  hrefEscaped: string;
  style: CampaignCtaStyleId;
  align: CampaignCtaAlign;
  withArrow: boolean;
  shape?: CampaignCtaShape;
  fill?: CampaignCtaFill;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  iconSvg?: string;
  iconPosition?: CampaignCtaIconPosition;
  customCss?: string;
  row?: number;
}

function renderOneInner(cta: PreparedCtaForLayout): string {
  return renderStyledCampaignCtaInner({
    labelEscaped: cta.labelEscaped,
    hrefEscaped: cta.hrefEscaped,
    style: cta.style,
    withArrow: cta.withArrow,
    shape: cta.shape,
    fill: cta.fill,
    bgColor: cta.bgColor,
    textColor: cta.textColor,
    borderColor: cta.borderColor,
    iconSvg: cta.iconSvg,
    iconPosition: cta.iconPosition,
    customCss: cta.customCss,
  });
}

function renderCtaRowGroup(ctas: PreparedCtaForLayout[], cellPadding: string): string {
  if (ctas.length === 1) {
    return renderStyledCampaignCta({
      ...ctas[0],
      cellPadding,
    });
  }

  const align = ctas.some((c) => c.align === 'center') ? 'center' : 'left';
  const textAlign = align === 'center' ? 'center' : 'left';
  const tableAlign = align === 'center' ? ' align="center" style="margin:0 auto;"' : '';
  const msoCells = ctas
    .map((cta, index) => {
      const gap = index < ctas.length - 1 ? 'padding-right:10px;' : '';
      return `<td style="vertical-align:middle;${gap}">${renderOneInner(cta)}</td>`;
    })
    .join('');
  const fluid = ctas
    .map((cta, index) => {
      const gap = index < ctas.length - 1 ? 'margin-right:10px;padding-right:0;' : '';
      return `<div class="nr-cta-wrap" style="display:inline-block;vertical-align:middle;${gap}padding-bottom:8px;">${renderOneInner(cta)}</div>`;
    })
    .join('');

  return `
          <tr>
            <td style="padding:${cellPadding};text-align:${textAlign};background-color:${CAMPAIGN_EMAIL.white};">
              <!--[if mso]>
              <table role="presentation" cellpadding="0" cellspacing="0"${tableAlign}><tr>
                  ${msoCells}
              </tr></table>
              <![endif]-->
              <!--[if !mso]><!-->
              <div class="nr-cta-row" style="text-align:${textAlign};">
                ${fluid}
              </div>
              <!--<![endif]-->
            </td>
          </tr>`;
}

/** Group by row: same number shares a line. Missing row uses ctaLayout. */
export function renderCampaignCtaGroup(
  ctas: PreparedCtaForLayout[],
  layout: CampaignCtaLayout = 'stack',
  cellPadding = '4px 48px 16px',
): string {
  if (!ctas.length) return '';
  const grouped = new Map<number, PreparedCtaForLayout[]>();
  const order: number[] = [];
  ctas.forEach((cta, index) => {
    const row = resolveCampaignCtaRow(cta, index, layout);
    if (!grouped.has(row)) {
      grouped.set(row, []);
      order.push(row);
    }
    grouped.get(row)!.push(cta);
  });
  return order.map((row) => renderCtaRowGroup(grouped.get(row) ?? [], cellPadding)).join('');
}

export { isCampaignHexColor, sanitizeCampaignCtaCss, sanitizeCampaignCtaSvg };
