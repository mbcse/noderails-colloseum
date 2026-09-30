import content from '../../../public/guides/merchant/content.json';

export type GuideBlock =
  | { type: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'text'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'img'; num: string };

type ContentFile = {
  guide: GuideBlock[];
  faq: GuideBlock[];
};

const raw = content as ContentFile;

/** Replace em/en dashes so copy never ships typographic dashes. */
function stripDashes(value: string): string {
  return value
    .replace(/\u2011/g, '-')
    .replace(/[\u2012\u2013\u2014]/g, ' - ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export type GuideTextPart =
  | { type: 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] };

export type GuideBeat = {
  text: GuideTextPart[];
  images: string[];
};

export type GuideStep = {
  id: string;
  number: number;
  title: string;
  fullTitle: string;
  beats: GuideBeat[];
};

export type MerchantGuideModel = {
  title: string;
  intro: string;
  steps: GuideStep[];
};

export type FaqItem = { question: string; answer: string };

export type FaqCategory = {
  title: string;
  items: FaqItem[];
};

export type MerchantFaqModel = {
  title: string;
  intro: string;
  categories: FaqCategory[];
};

function stepId(n: number): string {
  return `step-${n}`;
}

function parseStepNumber(title: string): number {
  const m = title.match(/^Step\s+(\d+)/i);
  return m ? Number(m[1]) : 0;
}

function stripStepPrefix(title: string): string {
  return title.replace(/^Step\s+\d+:\s*/i, '').trim();
}

function buildBeats(blocks: GuideBlock[]): GuideBeat[] {
  const beats: GuideBeat[] = [];
  let text: GuideTextPart[] = [];
  let images: string[] = [];

  const flush = () => {
    if (text.length === 0 && images.length === 0) return;
    beats.push({ text, images });
    text = [];
    images = [];
  };

  for (const block of blocks) {
    if (block.type === 'img') {
      if (block.num) images.push(block.num);
      continue;
    }
    // Starting new text after images closes the previous beat
    if (images.length > 0) {
      flush();
    }
    if (block.type === 'ul' || block.type === 'ol') {
      text.push({ type: block.type, items: block.items.map(stripDashes) });
    } else if (block.type === 'p' || block.type === 'text') {
      text.push({ type: 'p', text: stripDashes(block.text) });
    }
    // ignore nested headings inside a step body
  }
  flush();
  return beats;
}

export function getMerchantGuide(): MerchantGuideModel {
  const blocks = raw.guide;
  let title = 'Step-by-Step Guide';
  let intro = '';
  const steps: GuideStep[] = [];
  let current: { fullTitle: string; blocks: GuideBlock[] } | null = null;

  const pushCurrent = () => {
    if (!current) return;
    const number = parseStepNumber(current.fullTitle);
    steps.push({
      id: stepId(number || steps.length + 1),
      number: number || steps.length + 1,
      title: stripStepPrefix(current.fullTitle),
      fullTitle: current.fullTitle,
      beats: buildBeats(current.blocks),
    });
    current = null;
  };

  for (const block of blocks) {
    if (block.type === 'h1') {
      title = stripDashes(block.text);
      continue;
    }
    if (block.type === 'h3' && /^Step\s+\d+/i.test(block.text)) {
      pushCurrent();
      current = { fullTitle: stripDashes(block.text), blocks: [] };
      continue;
    }
    if (current) {
      current.blocks.push(block);
      continue;
    }
    if (block.type === 'p' && !intro) {
      intro = stripDashes(block.text);
    }
  }
  pushCurrent();

  return { title, intro, steps };
}

const FAQ_QA_RE = /^(Q\d+\.\s*.+?\?)\s*(.*)$/s;

export function getMerchantFaq(): MerchantFaqModel {
  const blocks = raw.faq;
  let title = 'FAQs';
  let intro = '';
  const categories: FaqCategory[] = [];
  let current: FaqCategory | null = null;

  for (const block of blocks) {
    if (block.type === 'h1') {
      title = 'Merchant FAQs';
      continue;
    }
    if (block.type === 'h2') {
      if (block.text === 'Introduction') continue;
      if (block.text === 'FAQ Content') continue;
      continue;
    }
    if (block.type === 'h3') {
      current = { title: stripDashes(block.text), items: [] };
      categories.push(current);
      continue;
    }
    if (block.type === 'p') {
      if (!current && !intro && !block.text.startsWith('Q')) {
        intro = stripDashes(block.text);
        continue;
      }
      if (!current) continue;
      const m = stripDashes(block.text).match(FAQ_QA_RE);
      if (m) {
        current.items.push({ question: m[1].trim(), answer: m[2].trim() });
      }
    }
  }

  return { title, intro, categories };
}

export function guideImageSrc(num: string): string {
  return `/guides/merchant/${num}.jpg`;
}
