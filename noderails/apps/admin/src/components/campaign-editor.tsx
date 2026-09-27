'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Film,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import {
  CAMPAIGN_GIF_SIZE_PRESETS,
  CAMPAIGN_GIF_WIDTH_DEFAULT,
  CAMPAIGN_GIF_WIDTH_MAX,
  CAMPAIGN_GIF_WIDTH_MIN,
  campaignGifImgStyle,
  clampCampaignGifWidth,
  type CampaignGifDisplay,
} from '@noderails/common';
import { Button, Input } from '@/components/ui';

const GIF_SIZE_OPTIONS: Array<{ id: keyof typeof CAMPAIGN_GIF_SIZE_PRESETS; label: string }> = [
  { id: 's', label: 'S' },
  { id: 'm', label: 'M' },
  { id: 'l', label: 'L' },
  { id: 'xl', label: 'XL' },
  { id: 'full', label: 'Full' },
];

const CampaignImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      nrGif: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-nr-gif'),
        renderHTML: (attributes) => {
          if (!attributes.nrGif) return {};
          return { 'data-nr-gif': '1' };
        },
      },
      nrDisplay: {
        default: 'inline',
        parseHTML: (element) => element.getAttribute('data-nr-display') || 'inline',
        renderHTML: (attributes) => {
          if (!attributes.nrGif) return {};
          return { 'data-nr-display': attributes.nrDisplay === 'block' ? 'block' : 'inline' };
        },
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) => {
          if (!attributes.nrGif || !attributes.width) return attributes.width ? { width: String(attributes.width) } : {};
          const widthPx = clampCampaignGifWidth(attributes.width);
          const display: CampaignGifDisplay = attributes.nrDisplay === 'block' ? 'block' : 'inline';
          return {
            width: String(widthPx),
            style: campaignGifImgStyle(widthPx, display),
          };
        },
      },
    };
  },
});

function isGifFile(file: File): boolean {
  return file.type === 'image/gif' || /\.gif$/i.test(file.name);
}

function isGifUrl(src: string): boolean {
  try {
    return new URL(src).pathname.toLowerCase().endsWith('.gif');
  } catch {
    return /\.gif(?:[?#]|$)/i.test(src);
  }
}

function toolbarClass(active: boolean): string {
  return `rounded-lg p-1.5 ${active ? 'bg-[#f0f0ff] text-[#635bff]' : 'text-[#425466] hover:bg-[#f6f9fc]'}`;
}

export function CampaignEditor({
  value,
  onChange,
  onUploadImage,
}: {
  value: string;
  onChange: (html: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const gifFileRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [imageUrl, setImageUrl] = useState('https://');
  const [gifUrl, setGifUrl] = useState('https://');
  const [gifInsertWidth, setGifInsertWidth] = useState<number>(CAMPAIGN_GIF_SIZE_PRESETS.l);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      CampaignImage.configure({ inline: true, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
      Placeholder.configure({ placeholder: 'Write the update. Add links, images, and GIFs from the toolbar.' }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'min-h-52 px-4 py-3 text-sm leading-relaxed text-[#0a2540] focus:outline-none',
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.isEmpty ? '' : instance.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (value !== current && !(editor.isEmpty && !value)) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return <div className="min-h-52 rounded-xl border border-[#e3e8ee] bg-white" />;

  const applyLink = () => {
    const href = linkUrl.trim();
    if (!/^https?:\/\//i.test(href)) {
      setError('Links must start with http:// or https://');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    setLinkOpen(false);
    setError('');
  };

  const insertImage = (src: string, opts?: { gif?: boolean; alt?: string }) => {
    const gif = Boolean(opts?.gif || isGifUrl(src));
    editor.chain().focus().setImage({
      src,
      alt: opts?.alt,
      ...(gif ? {
        nrGif: '1',
        nrDisplay: 'inline',
        width: clampCampaignGifWidth(gifInsertWidth, CAMPAIGN_GIF_SIZE_PRESETS.l),
      } : {}),
    } as { src: string; alt?: string; nrGif?: string; nrDisplay?: string; width?: number }).run();
    setError('');
  };

  const selectedImage = editor.getAttributes('image');
  const gifSelected = editor.isActive('image') && Boolean(selectedImage.nrGif);
  const gifWidth = clampCampaignGifWidth(selectedImage.width, CAMPAIGN_GIF_WIDTH_DEFAULT);
  const gifDisplay: CampaignGifDisplay = selectedImage.nrDisplay === 'block' ? 'block' : 'inline';

  const updateSelectedGif = (patch: { width?: number; nrDisplay?: CampaignGifDisplay }) => {
    editor.chain().focus().updateAttributes('image', {
      ...(patch.width != null ? { width: clampCampaignGifWidth(patch.width) } : {}),
      ...(patch.nrDisplay ? { nrDisplay: patch.nrDisplay } : {}),
    }).run();
  };

  const applyImageUrl = () => {
    const src = imageUrl.trim();
    if (!/^https:\/\//i.test(src)) {
      setError('Image URLs must start with https://');
      return;
    }
    insertImage(src);
    setImageOpen(false);
  };

  const applyGifUrl = () => {
    const src = gifUrl.trim();
    if (!/^https:\/\//i.test(src)) {
      setError('GIF URLs must start with https://');
      return;
    }
    insertImage(src, { gif: true });
    setGifOpen(false);
  };

  const uploadFile = async (file?: File | null, asGif = false) => {
    if (!file) return;
    if (asGif && !isGifFile(file)) {
      setError('Choose a .gif file');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const src = await onUploadImage(file);
      insertImage(src, { gif: asGif || isGifFile(file), alt: file.name });
      setImageOpen(false);
      setGifOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not upload image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-[#425466]">Body</p>
      <div className="overflow-hidden rounded-xl border border-[#e3e8ee] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[#f0f2f5] px-2 py-1.5">
          <button type="button" className={toolbarClass(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarClass(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarClass(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarClass(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading">
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarClass(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullets">
            <List className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarClass(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarClass(editor.isActive('link') || linkOpen)} onClick={() => { setImageOpen(false); setGifOpen(false); setLinkOpen((v) => !v); setLinkUrl(editor.getAttributes('link').href || 'https://'); }} title="Link">
            <Link2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarClass(imageOpen)} onClick={() => { setLinkOpen(false); setGifOpen(false); setImageOpen((v) => !v); }} title="Image">
            <ImagePlus className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarClass(gifOpen)} onClick={() => { setLinkOpen(false); setImageOpen(false); setGifOpen((v) => !v); }} title="GIF">
            <Film className="h-3.5 w-3.5" />
          </button>
          <span className="mx-1 h-4 w-px bg-[#e3e8ee]" />
          <button type="button" className={toolbarClass(false)} onClick={() => editor.chain().focus().undo().run()} title="Undo">
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolbarClass(false)} onClick={() => editor.chain().focus().redo().run()} title="Redo">
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {linkOpen && (
          <div className="flex flex-wrap items-end gap-2 border-b border-[#f0f2f5] bg-[#f7f7ff] px-3 py-2">
            <div className="min-w-0 flex-1">
              <Input label="Link URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </div>
            <Button size="sm" onClick={applyLink}>Apply</Button>
          </div>
        )}
        {imageOpen && (
          <div className="space-y-2 border-b border-[#f0f2f5] bg-[#f7f7ff] px-3 py-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input label="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://" />
              </div>
              <Button size="sm" variant="secondary" onClick={applyImageUrl}>Insert URL</Button>
              <Button size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
                {busy ? 'Uploading…' : 'Upload'}
              </Button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => void uploadFile(e.target.files?.[0])} />
            </div>
          </div>
        )}
        {gifOpen && (
          <div className="space-y-2 border-b border-[#f0f2f5] bg-[#f7f7ff] px-3 py-2">
            <p className="text-[11px] text-[#697386]">Inserts at the cursor. Click the GIF after insert to change size.</p>
            <GifSizeControls
              width={gifInsertWidth}
              display="inline"
              onWidth={(width) => setGifInsertWidth(width)}
            />
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input label="GIF URL" value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} placeholder="https://" />
              </div>
              <Button size="sm" variant="secondary" onClick={applyGifUrl}>Insert URL</Button>
              <Button size="sm" disabled={busy} onClick={() => gifFileRef.current?.click()}>
                {busy ? 'Uploading…' : 'Upload GIF'}
              </Button>
              <input ref={gifFileRef} type="file" accept="image/gif,.gif" className="hidden" onChange={(e) => void uploadFile(e.target.files?.[0], true)} />
            </div>
          </div>
        )}
        {gifSelected && !gifOpen && (
          <div className="space-y-2 border-b border-[#f0f2f5] bg-[#f7f7ff] px-3 py-2">
            <p className="text-[11px] font-medium text-[#425466]">Selected GIF</p>
            <GifSizeControls
              width={gifWidth}
              display={gifDisplay}
              onWidth={(width) => updateSelectedGif({ width })}
              onDisplay={(nrDisplay) => updateSelectedGif({ nrDisplay })}
            />
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
      {error ? <p className="mt-1.5 text-xs text-[#df1b41]">{error}</p> : null}
    </div>
  );
}

function GifSizeControls({
  width,
  display,
  onWidth,
  onDisplay,
}: {
  width: number;
  display: CampaignGifDisplay;
  onWidth: (width: number) => void;
  onDisplay?: (display: CampaignGifDisplay) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {GIF_SIZE_OPTIONS.map((opt) => {
          const px = CAMPAIGN_GIF_SIZE_PRESETS[opt.id];
          const selected = width === px;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onWidth(px)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                selected ? 'bg-white text-[#0a2540] shadow-sm ring-1 ring-[#e3e8ee]' : 'text-[#697386] hover:bg-white/70'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
        <label className="ml-1 inline-flex items-center gap-1.5 text-[11px] text-[#697386]">
          Width
          <input
            type="number"
            min={CAMPAIGN_GIF_WIDTH_MIN}
            max={CAMPAIGN_GIF_WIDTH_MAX}
            value={width}
            onChange={(e) => onWidth(clampCampaignGifWidth(e.target.value))}
            className="h-7 w-16 rounded-md border border-[#e3e8ee] bg-white px-1.5 text-[11px] text-[#0a2540]"
          />
          px
        </label>
      </div>
      <input
        type="range"
        min={CAMPAIGN_GIF_WIDTH_MIN}
        max={CAMPAIGN_GIF_WIDTH_MAX}
        value={width}
        onChange={(e) => onWidth(clampCampaignGifWidth(e.target.value))}
        className="w-full accent-[#635bff]"
      />
      {onDisplay ? (
        <div className="inline-flex rounded-lg bg-white p-0.5 ring-1 ring-[#e3e8ee]">
          {([
            { value: 'inline' as const, label: 'In line' },
            { value: 'block' as const, label: 'Own line' },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onDisplay(opt.value)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                display === opt.value ? 'bg-[#f7f7ff] text-[#0a2540] shadow-sm' : 'text-[#697386]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
