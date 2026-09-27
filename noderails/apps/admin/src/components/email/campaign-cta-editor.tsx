'use client';

import { useMemo, useState } from 'react';
import {
  CAMPAIGN_CTA_MAX,
  CAMPAIGN_CTA_PALETTE,
  CAMPAIGN_CTA_STYLE_CATALOG,
  defaultStyleForTemplate,
  radiusForShape,
  renderStyledCampaignCtaInner,
  visualFromStyleId,
  type CampaignCtaAlign,
  type CampaignCtaFill,
  type CampaignCtaInput,
  type CampaignCtaLayout,
  type CampaignCtaPlacement,
  type CampaignCtaShape,
} from '@noderails/common';
import { Button, Input } from '@/components/ui';
import { GripVertical, Plus, Search, Trash2, X } from 'lucide-react';
import { CAMPAIGN_LUCIDE_ICONS, findCampaignLucideIcon, snapshotLucideIcon } from './campaign-cta-icons';

export type ComposeCta = CampaignCtaInput;

const PLACEMENT_LABELS: Record<CampaignCtaPlacement, string> = {
  after_heading: 'After heading',
  after_body: 'After body',
  before_signer: 'Before sign-off',
};

function newCtaId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `cta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapePreview(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function serializeComposeCtas(ctas: ComposeCta[]): ComposeCta[] | undefined {
  const ready = ctas.filter((c) => c.label.trim() && c.url.trim());
  if (!ready.length) return undefined;
  return ready.map((c) => ({
    id: c.id,
    label: c.label.trim(),
    url: c.url.trim(),
    placement: c.placement,
    style: c.style,
    align: c.align,
    withArrow: c.withArrow,
    shape: c.shape,
    fill: c.fill,
    bgColor: c.bgColor,
    textColor: c.textColor,
    borderColor: c.borderColor,
    iconName: c.iconName,
    iconSvg: c.iconSvg,
    iconPosition: c.iconPosition,
    customCss: c.customCss,
    row: c.row,
  }));
}

export function createEmptyCta(templateId?: string, row = 1): ComposeCta {
  const style = defaultStyleForTemplate(templateId);
  const meta = CAMPAIGN_CTA_STYLE_CATALOG.find((s) => s.id === style);
  const visual = visualFromStyleId(style);
  return {
    id: newCtaId(),
    label: '',
    url: '',
    placement: 'after_body',
    style,
    align: meta?.defaultAlign ?? 'left',
    withArrow: false,
    shape: visual.shape,
    fill: visual.fill,
    bgColor: visual.bgColor,
    textColor: visual.textColor,
    borderColor: visual.borderColor,
    row,
  };
}

interface CampaignCtaEditorProps {
  ctas: ComposeCta[];
  onChange: (ctas: ComposeCta[]) => void;
  ctaLayout: CampaignCtaLayout;
  onLayoutChange: (layout: CampaignCtaLayout) => void;
  templateId: string;
  showSignerSlot: boolean;
}

export function CampaignCtaEditor({
  ctas,
  onChange,
  ctaLayout: _ctaLayout,
  onLayoutChange,
  templateId,
  showSignerSlot,
}: CampaignCtaEditorProps) {
  const update = (id: string, patch: Partial<ComposeCta>) => {
    onChange(ctas.map((cta) => (cta.id === id ? { ...cta, ...patch } : cta)));
  };

  const remove = (id: string) => onChange(ctas.filter((cta) => cta.id !== id));

  const add = () => {
    if (ctas.length >= CAMPAIGN_CTA_MAX) return;
    const nextRow = (ctas[ctas.length - 1]?.row ?? ctas.length) + 1;
    onChange([...ctas, createEmptyCta(templateId, nextRow)]);
    onLayoutChange('stack');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#0a2540]">Buttons</p>
          <p className="mt-0.5 text-xs text-[#697386]">
            Add up to {CAMPAIGN_CTA_MAX}. Same row number puts buttons on the same line. Each click is tracked separately.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={add} disabled={ctas.length >= CAMPAIGN_CTA_MAX}>
          <Plus className="h-3.5 w-3.5" />
          Add button
        </Button>
      </div>

      {ctas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d1d8e0] bg-[#f6f9fc] px-4 py-5 text-center text-xs text-[#697386]">
          No buttons yet. Add one, then drag it onto the preview.
        </div>
      ) : (
        <ul className="space-y-3">
          {ctas.map((cta, index) => (
            <CtaDesignerCard
              key={cta.id}
              cta={cta}
              index={index}
              showSignerSlot={showSignerSlot}
              onUpdate={(patch) => update(cta.id, patch)}
              onRemove={() => remove(cta.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CtaDesignerCard({
  cta,
  index,
  showSignerSlot,
  onUpdate,
  onRemove,
}: {
  cta: ComposeCta;
  index: number;
  showSignerSlot: boolean;
  onUpdate: (patch: Partial<ComposeCta>) => void;
  onRemove: () => void;
}) {
  const [iconQuery, setIconQuery] = useState('');
  const visual = {
    ...visualFromStyleId(cta.style),
    ...(cta.shape ? { shape: cta.shape } : {}),
    ...(cta.fill ? { fill: cta.fill } : {}),
    ...(cta.bgColor ? { bgColor: cta.bgColor } : {}),
    ...(cta.textColor ? { textColor: cta.textColor } : {}),
    ...(cta.borderColor ? { borderColor: cta.borderColor } : {}),
  };
  const matches = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    if (!q) return CAMPAIGN_LUCIDE_ICONS.slice(0, 18);
    return CAMPAIGN_LUCIDE_ICONS.filter((item) =>
      `${item.name} ${item.keywords}`.toLowerCase().includes(q),
    ).slice(0, 18);
  }, [iconQuery]);

  const pickIcon = (name: string) => {
    const Icon = findCampaignLucideIcon(name);
    if (!Icon) return;
    onUpdate({
      iconName: name,
      iconSvg: snapshotLucideIcon(Icon),
      iconPosition: cta.iconPosition ?? 'left',
    });
  };

  const previewHtml = renderStyledCampaignCtaInner({
    labelEscaped: escapePreview(cta.label.trim() || 'Button'),
    hrefEscaped: '#',
    style: cta.style,
    withArrow: cta.withArrow,
    shape: visual.shape,
    fill: visual.fill,
    bgColor: visual.bgColor,
    textColor: visual.textColor,
    borderColor: visual.borderColor,
    iconSvg: cta.iconSvg,
    iconPosition: cta.iconPosition,
    customCss: cta.customCss,
  });

  return (
    <li className="rounded-xl border border-[#e3e8ee] bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[#425466]">
          Button {index + 1}
          <span className="ml-2 font-normal text-[#a3acb9]">
            {PLACEMENT_LABELS[cta.placement]}
            {!showSignerSlot && cta.placement === 'before_signer' ? ' → after body' : ''}
          </span>
        </p>
        <button
          type="button"
          className="rounded-md p-1 text-[#a3acb9] hover:bg-[#f6f9fc] hover:text-[#df1b41]"
          onClick={onRemove}
          aria-label="Remove button"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          label="Label"
          value={cta.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Get started"
        />
        <Input
          label="URL"
          value={cta.url}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://"
        />
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#697386]">Live</p>
        <div
          className="rounded-lg bg-[#f6f9fc] px-3 py-3"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#697386]">Shape</p>
        <div className="inline-flex rounded-lg bg-[#f6f9fc] p-0.5 ring-1 ring-[#e3e8ee]">
          {([
            { value: 'square' as const, label: 'Square' },
            { value: 'rect' as const, label: 'Rectangle' },
            { value: 'pill' as const, label: 'Pill' },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate({ shape: opt.value as CampaignCtaShape })}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                visual.shape === opt.value ? 'bg-white text-[#0a2540] shadow-sm' : 'text-[#697386]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#697386]">Fill</p>
        <div className="inline-flex rounded-lg bg-[#f6f9fc] p-0.5 ring-1 ring-[#e3e8ee]">
          {([
            { value: 'solid' as const, label: 'Solid' },
            { value: 'outline' as const, label: 'Outline' },
            { value: 'text' as const, label: 'Text' },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate({ fill: opt.value as CampaignCtaFill })}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                visual.fill === opt.value ? 'bg-white text-[#0a2540] shadow-sm' : 'text-[#697386]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ColorField
        label="Background"
        value={visual.bgColor}
        onChange={(bgColor) => onUpdate({ bgColor })}
      />
      <ColorField
        label="Text"
        value={visual.textColor}
        onChange={(textColor) => onUpdate({ textColor })}
      />
      <ColorField
        label="Border"
        value={visual.borderColor}
        onChange={(borderColor) => onUpdate({ borderColor })}
      />

      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#697386]">Icon</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#a3acb9]" />
          <input
            className="h-9 w-full rounded-lg border border-[#e3e8ee] bg-white pl-8 pr-3 text-xs text-[#0a2540] outline-none focus:border-[#635bff]"
            placeholder="Search Lucide icons"
            value={iconQuery}
            onChange={(e) => setIconQuery(e.target.value)}
          />
        </div>
        <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-9">
          {matches.map((item) => {
            const selected = cta.iconName === item.name;
            return (
              <button
                key={item.name}
                type="button"
                title={item.name}
                onClick={() => pickIcon(item.name)}
                className={`flex h-8 items-center justify-center rounded-md border ${
                  selected ? 'border-[#635bff] bg-[#f7f7ff]' : 'border-[#e3e8ee] hover:border-[#cfd6de]'
                }`}
              >
                <item.Icon className="h-3.5 w-3.5 text-[#0a2540]" />
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-[#f6f9fc] p-0.5 ring-1 ring-[#e3e8ee]">
            {(['left', 'right'] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => onUpdate({ iconPosition: pos })}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize ${
                  (cta.iconPosition ?? 'left') === pos ? 'bg-white text-[#0a2540] shadow-sm' : 'text-[#697386]'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
          {cta.iconSvg ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] text-[#697386] hover:text-[#df1b41]"
              onClick={() => onUpdate({ iconName: undefined, iconSvg: undefined })}
            >
              <X className="h-3 w-3" />
              Clear icon
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Input
          label="Row"
          type="number"
          min={1}
          max={20}
          value={String(cta.row ?? index + 1)}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            onUpdate({ row: Number.isInteger(n) ? Math.min(20, Math.max(1, n)) : 1 });
          }}
        />
        <p className="self-end pb-2 text-[11px] text-[#a3acb9]">Same number = same line</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-[#f6f9fc] p-0.5 ring-1 ring-[#e3e8ee]">
          {(['left', 'center'] as CampaignCtaAlign[]).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => onUpdate({ align })}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize ${
                (cta.align ?? 'left') === align ? 'bg-white text-[#0a2540] shadow-sm' : 'text-[#697386]'
              }`}
            >
              {align}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-[#425466]">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[#635bff]"
            checked={Boolean(cta.withArrow)}
            onChange={(e) => onUpdate({ withArrow: e.target.checked })}
          />
          Show arrow
        </label>
        <span className="text-[11px] text-[#a3acb9]">radius {radiusForShape(visual.shape)}</span>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#697386]">Custom CSS</span>
        <textarea
          className="min-h-[64px] w-full rounded-lg border border-[#e3e8ee] px-3 py-2 font-mono text-[11px] text-[#0a2540] outline-none focus:border-[#635bff]"
          placeholder="padding:10px 18px; font-weight:600"
          value={cta.customCss ?? ''}
          onChange={(e) => onUpdate({ customCss: e.target.value })}
        />
      </label>
    </li>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#697386]">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {CAMPAIGN_CTA_PALETTE.map((hex) => (
          <button
            key={`${label}-${hex}`}
            type="button"
            title={hex}
            onClick={() => onChange(hex)}
            className={`h-5 w-5 rounded-full border ${
              value.toLowerCase() === hex.toLowerCase() ? 'ring-2 ring-[#635bff] ring-offset-1' : 'border-[#e3e8ee]'
            }`}
            style={{ backgroundColor: hex }}
          />
        ))}
        <input
          className="ml-1 h-7 w-[92px] rounded-md border border-[#e3e8ee] px-2 font-mono text-[11px] text-[#0a2540]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

interface PlacementCanvasProps {
  ctas: ComposeCta[];
  onChange: (ctas: ComposeCta[]) => void;
  heading: string;
  showSignerSlot: boolean;
  showBackedBy: boolean;
  ctaLayout?: CampaignCtaLayout;
}

export function CampaignCtaPlacementCanvas({
  ctas,
  onChange,
  heading,
  showSignerSlot,
  showBackedBy,
  ctaLayout = 'stack',
}: PlacementCanvasProps) {
  const moveTo = (ctaId: string, placement: CampaignCtaPlacement, beforeId?: string) => {
    const moving = ctas.find((c) => c.id === ctaId);
    if (!moving) return;
    const rest = ctas.filter((c) => c.id !== ctaId);
    const updated = { ...moving, placement };
    const same = rest.filter((c) => c.placement === placement);
    const other = rest.filter((c) => c.placement !== placement);
    let nextSame: ComposeCta[];
    if (beforeId) {
      const idx = same.findIndex((c) => c.id === beforeId);
      nextSame = idx >= 0
        ? [...same.slice(0, idx), updated, ...same.slice(idx)]
        : [...same, updated];
    } else {
      nextSame = [...same, updated];
    }
    onChange([...other, ...nextSame]);
  };

  const zones: Array<{ placement: CampaignCtaPlacement; label: string; hint: string }> = [
    { placement: 'after_heading', label: 'After heading', hint: 'Drop buttons here' },
    { placement: 'after_body', label: 'After body', hint: 'Drop buttons here' },
  ];
  if (showSignerSlot) {
    zones.push({ placement: 'before_signer', label: 'Before sign-off', hint: 'Drop buttons here' });
  }

  return (
    <div className="rounded-xl border border-[#e3e8ee] bg-[#f6f9fc] p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#697386]">
        Place buttons — drag onto a zone · same row number = same line
      </p>
      <div className="space-y-2 rounded-lg bg-white p-3 ring-1 ring-[#e3e8ee]">
        <div className="rounded-md bg-[#0a2540] px-3 py-2">
          <p className="truncate text-xs font-medium text-white">{heading.trim() || 'Heading'}</p>
        </div>

        {zones.map((zone, i) => {
          const inZone = ctas.filter((c) => {
            if (c.placement === zone.placement) return true;
            if (!showSignerSlot && zone.placement === 'after_body' && c.placement === 'before_signer') return true;
            return false;
          });
          return (
            <div key={zone.placement}>
              {i === 1 && (
                <div className="mb-2 rounded-md border border-dashed border-[#e3e8ee] px-3 py-4 text-center text-[11px] text-[#a3acb9]">
                  Body content
                </div>
              )}
              <DropZone
                label={zone.label}
                hint={zone.hint}
                ctas={inZone}
                layout={ctaLayout}
                onDrop={(ctaId, beforeId) => moveTo(ctaId, zone.placement, beforeId)}
              />
              {zone.placement === 'before_signer' && (
                <div className="mt-2 rounded-md bg-[#f6f9fc] px-3 py-2 text-[11px] text-[#697386]">
                  Sign-off
                </div>
              )}
            </div>
          );
        })}

        <div className="rounded-md border border-[#eef2f6] px-3 py-2 text-[10px] leading-relaxed text-[#697386]">
          Footer{showBackedBy ? ' · backed-by on' : ' · backed-by off'}
        </div>
      </div>
    </div>
  );
}

function DropZone({
  label,
  hint,
  ctas,
  layout = 'stack',
  onDrop,
}: {
  label: string;
  hint: string;
  ctas: ComposeCta[];
  layout?: CampaignCtaLayout;
  onDrop: (ctaId: string, beforeId?: string) => void;
}) {
  const groups = new Map<number, ComposeCta[]>();
  const order: number[] = [];
  ctas.forEach((cta, index) => {
    const row = typeof cta.row === 'number' ? cta.row : (layout === 'row' ? 1 : index + 1);
    if (!groups.has(row)) {
      groups.set(row, []);
      order.push(row);
    }
    groups.get(row)!.push(cta);
  });

  return (
    <div
      className="min-h-[48px] rounded-lg border border-dashed border-[#cfd6de] bg-[#fafbfd] p-2 transition-colors"
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.classList.add('border-[#635bff]', 'bg-[#f7f7ff]');
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove('border-[#635bff]', 'bg-[#f7f7ff]');
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-[#635bff]', 'bg-[#f7f7ff]');
        const ctaId = e.dataTransfer.getData('text/cta-id');
        if (ctaId) onDrop(ctaId);
      }}
    >
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#a3acb9]">{label}</p>
      {ctas.length === 0 ? (
        <p className="py-2 text-center text-[11px] text-[#c1c7d0]">{hint}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {order.map((row) => (
            <div key={row} className="flex flex-wrap gap-1.5">
              {(groups.get(row) ?? []).map((cta) => (
                <div
                  key={cta.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/cta-id', cta.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  className="inline-flex cursor-grab items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#0a2540] ring-1 ring-[#e3e8ee] active:cursor-grabbing"
                >
                  <GripVertical className="h-3 w-3 text-[#a3acb9]" />
                  {cta.label.trim() || 'Untitled'}
                  <span className="text-[9px] text-[#a3acb9]">r{row}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
