import { describe, expect, it } from 'vitest';
import { CAMPAIGN_CONFIDENTIAL_DISCLAIMER, CAMPAIGN_FOOTER_BACKED_BY, CAMPAIGN_FOOTER_TAGLINE } from './campaign-brand.js';
import { DEFAULT_CAMPAIGN_SIGNER_NAME, DEFAULT_CAMPAIGN_SIGNER_ORG, EMAIL_CAMPAIGN_TEMPLATE_IDS, getCampaignTemplateSample } from './campaign-template-catalog.js';
import { sanitizeCampaignCtaCss, sanitizeCampaignCtaSvg, visualFromStyleId } from './campaign-cta-styles.js';
import { extractHttpUrls, isSafeHttpUrl, renderCampaignEmail } from './campaign-template.js';

const OUTREACH_IDS = [
  'BUSINESS_OUTREACH',
  'DIRECT_OUTREACH',
  'PARTNERSHIP',
  'EVENT_INVITE',
  'FOLLOW_UP',
] as const;

function render(templateId?: string) {
  return renderCampaignEmail({
    templateId,
    fromAddress: 'updates@mail.noderails.com',
    heading: 'Hello <script>',
    body: 'Read https://noderails.com/blog',
    logoUrl: 'https://api.example/public/email/noderails-logo-48.png',
    ctaLabel: 'Read more',
    ctaUrl: 'https://noderails.com/blog',
    wrapLink: (url) => `https://api.example/click?u=${encodeURIComponent(url)}`,
  });
}

describe('campaign template', () => {
  it('extracts unique http(s) URLs', () => {
    expect(extractHttpUrls('See https://noderails.com/docs and https://noderails.com/docs again.'))
      .toEqual(['https://noderails.com/docs']);
  });

  it('rejects javascript URLs', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('https://noderails.com')).toBe(true);
  });

  it('escapes heading and wraps links', () => {
    const html = render('UPDATES');
    expect(html).toContain('Hello &lt;script&gt;');
    expect(html).toContain('https://api.example/click?u=https%3A%2F%2Fnoderails.com%2Fblog');
    expect(html).not.toContain('<script>');
  });

  it('preserves query strings when linkifying', () => {
    const html = renderCampaignEmail({
      fromAddress: 'updates@mail.noderails.com',
      heading: 'Link',
      body: 'Open https://noderails.com/docs?utm=1&ref=email',
    });
    expect(html).toContain('href="https://noderails.com/docs?utm=1&amp;ref=email"');
  });

  it('uses brand chrome and inbox display name', () => {
    const html = renderCampaignEmail({
      fromAddress: 'updates@mail.noderails.com',
      heading: 'Ship',
      body: 'Hello',
    });
    expect(html).toContain('SF Pro Display');
    expect(html).toContain('#1d1d1f');
    expect(html).toContain('background-color:#000000');
    expect(html).toContain('NodeRails Updates');
    expect(html).toContain('font-size:32px');
    expect(html).not.toContain('#0f172a');
  });

  it('renders hero, CTA pill, logo lockup, and footer', () => {
    const html = render('UPDATES');
    expect(html).toContain('https://api.example/public/email/noderails-logo-48.png');
    expect(html).toContain(CAMPAIGN_FOOTER_TAGLINE);
    expect(html).toContain(CAMPAIGN_FOOTER_BACKED_BY);
    expect(html).not.toContain('NodeRails is a financial technology company');
    expect(html).not.toContain('Crypto and stablecoins financial infrastructure');
    expect(html).not.toContain('KOSH');
    expect(html).toContain('text-decoration:underline');
    expect(html).toContain('background-color:#000000');
    expect(html).not.toContain('Unsubscribe');
    expect(html).not.toContain('Manage preferences');
    expect(html).toContain('Dashboard');
    expect(html).toContain('Read more');
    expect(html).toContain('border-radius:980px');
    expect(html).toContain('display:none;max-height:0');
  });

  it('extracts hrefs from HTML bodies', () => {
    expect(extractHttpUrls('<p>See <a href="https://noderails.com/docs">docs</a></p>'))
      .toEqual(['https://noderails.com/docs']);
  });

  it('wraps footer website, docs, and dashboard links', () => {
    const html = render('UPDATES');
    expect(html).toContain('https://api.example/click?u=https%3A%2F%2Fnoderails.com%2F%3Fref%3Demailoutreach');
    expect(html).toContain('https://api.example/click?u=https%3A%2F%2Fnoderails.com%2Fdocs%2F%3Fref%3Demailoutreach');
    expect(html).toContain('https://api.example/click?u=https%3A%2F%2Fmerchant.noderails.com%2F%3Fref%3Demailoutreach');
  });

  it('falls back to UPDATES for an unknown template', () => {
    const html = render('NOT_A_TEMPLATE');
    expect(html).toContain('font-size:32px');
    expect(html).not.toContain(CAMPAIGN_CONFIDENTIAL_DISCLAIMER);
  });

  it('does not use em dashes in any template', () => {
    for (const id of EMAIL_CAMPAIGN_TEMPLATE_IDS) {
      expect(render(id).includes('\u2014')).toBe(false);
    }
  });

  it('includes a confidential disclaimer on outreach templates only', () => {
    for (const id of OUTREACH_IDS) {
      const html = render(id);
      expect(html).toContain(CAMPAIGN_CONFIDENTIAL_DISCLAIMER);
      expect(html).not.toContain('Unsubscribe');
      expect(html).toContain('Dashboard');
      expect(html).not.toContain('font-size:32px');
    }
    expect(render('UPDATES')).not.toContain(CAMPAIGN_CONFIDENTIAL_DISCLAIMER);
    expect(render('ANNOUNCEMENT')).not.toContain(CAMPAIGN_CONFIDENTIAL_DISCLAIMER);
  });

  it('puts backed-by under the tagline, then links and confidential above the black bar', () => {
    const html = render('DIRECT_OUTREACH');
    const taglineIndex = html.indexOf(CAMPAIGN_FOOTER_TAGLINE);
    const backedIndex = html.indexOf(CAMPAIGN_FOOTER_BACKED_BY);
    const dashboardIndex = html.indexOf('>Dashboard</a>');
    const confidentialIndex = html.indexOf(CAMPAIGN_CONFIDENTIAL_DISCLAIMER);
    const blackBarIndex = html.indexOf('background-color:#000000');
    expect(html).not.toContain('You received this because you are on the NodeRails updates list.');
    expect(html).not.toContain('NodeRails is a financial technology company');
    expect(backedIndex).toBeGreaterThan(taglineIndex);
    expect(dashboardIndex).toBeGreaterThan(backedIndex);
    expect(confidentialIndex).toBeGreaterThan(dashboardIndex);
    expect(blackBarIndex).toBeGreaterThan(confidentialIndex);
  });

  it('renders announcement chrome without a black hero', () => {
    const html = render('ANNOUNCEMENT');
    expect(html).toContain('Announcement');
    expect(html).not.toContain('font-size:32px');
    expect(html).not.toContain('Unsubscribe');
  });

  it('renders event invite chrome', () => {
    const html = render('EVENT_INVITE');
    expect(html).toContain('You are invited');
    expect(html).toContain(CAMPAIGN_CONFIDENTIAL_DISCLAIMER);
  });

  it('renders partnership chrome', () => {
    const html = render('PARTNERSHIP');
    expect(html).toContain('Partnership');
    expect(html).toContain(CAMPAIGN_CONFIDENTIAL_DISCLAIMER);
  });

  it('signs direct 1:1 as Business team, NodeRails by default', () => {
    const html = renderCampaignEmail({
      templateId: 'DIRECT_OUTREACH',
      fromAddress: 'business@noderails.com',
      heading: 'Quick note',
      body: 'Hello',
    });
    expect(html).toContain(DEFAULT_CAMPAIGN_SIGNER_NAME);
    expect(html).toContain(DEFAULT_CAMPAIGN_SIGNER_ORG);
    expect(html).not.toContain('Best,');
    expect(html).not.toContain('Mohit');
    expect(html).not.toContain('Reply to this email');
  });

  it('lets a direct 1:1 note use a custom name and title', () => {
    const html = renderCampaignEmail({
      templateId: 'DIRECT_OUTREACH',
      fromAddress: 'business@noderails.com',
      heading: 'Quick note',
      body: 'Hello',
      signerName: 'Ada Lovelace',
      signerTitle: 'CTO',
    });
    expect(html).toContain('Ada Lovelace');
    expect(html).toContain('CTO');
    expect(html).toContain(DEFAULT_CAMPAIGN_SIGNER_ORG);
    expect(html).not.toContain(DEFAULT_CAMPAIGN_SIGNER_NAME);
  });

  it('keeps personal names out of the direct 1:1 sample', () => {
    const sample = getCampaignTemplateSample('DIRECT_OUTREACH');
    expect(sample.body).not.toContain('Mohit');
    expect(sample.body).not.toContain('Best,');
    expect(sample.ctaLabel).toBe('');
  });

  it('does not invent a 1:1 button from the sign-off', () => {
    const html = renderCampaignEmail({
      templateId: 'DIRECT_OUTREACH',
      fromAddress: 'business@noderails.com',
      heading: 'Quick note',
      body: 'Hello',
      signerName: 'Mohit',
      signerTitle: 'CEO',
      ctaUrl: 'https://noderails.com/call',
    });
    expect(html).not.toContain('href="https://noderails.com/call"');
    expect(html).toContain('Mohit</div>');
    expect(html).toContain('CEO');
  });

  it('renders a labeled 1:1 button above the plain sign-off', () => {
    const html = renderCampaignEmail({
      templateId: 'DIRECT_OUTREACH',
      fromAddress: 'business@noderails.com',
      heading: 'Quick note',
      body: 'Hello',
      signerName: 'Mohit',
      signerTitle: 'CEO',
      ctaLabel: 'Book a call',
      ctaUrl: 'https://noderails.com/call',
    });
    const buttonIndex = html.indexOf('href="https://noderails.com/call"');
    const buttonClose = html.indexOf('</a>', buttonIndex);
    const signerIndex = html.indexOf('Mohit</div>');
    expect(buttonIndex).toBeGreaterThan(-1);
    expect(signerIndex).toBeGreaterThan(buttonClose);
    expect(html).toMatch(/>\s*Book a call\s*<\/a>/);
    expect(html).toContain('CEO');
    expect(html).toContain(DEFAULT_CAMPAIGN_SIGNER_ORG);
    expect(html).not.toContain('Reply to this email');
  });

  it('omits backed-by when showBackedBy is false', () => {
    const html = renderCampaignEmail({
      templateId: 'UPDATES',
      fromAddress: 'updates@mail.noderails.com',
      heading: 'Hello',
      body: 'Body',
      showBackedBy: false,
    });
    expect(html).not.toContain(CAMPAIGN_FOOTER_BACKED_BY);
    expect(html).toContain(CAMPAIGN_FOOTER_TAGLINE);
  });

  it('renders multiple CTAs in placement order with wrapLink', () => {
    const html = renderCampaignEmail({
      templateId: 'FOLLOW_UP',
      fromAddress: 'updates@mail.noderails.com',
      heading: 'Launch',
      body: 'UNIQUE_BODY_MARKER',
      ctas: [
        {
          id: 'cta-a',
          label: 'Primary',
          url: 'https://noderails.com/a',
          placement: 'after_heading',
          style: 'purple_fill',
          align: 'center',
        },
        {
          id: 'cta-b',
          label: 'Secondary',
          url: 'https://noderails.com/b',
          placement: 'after_body',
          style: 'outline_dark',
          align: 'left',
          withArrow: true,
        },
      ],
      wrapLink: (url, ctaId) => `https://track.example/${ctaId ?? 'x'}?u=${encodeURIComponent(url)}`,
    });
    const primary = html.indexOf('https://track.example/cta-a?u=');
    const secondary = html.indexOf('https://track.example/cta-b?u=');
    expect(primary).toBeGreaterThan(-1);
    expect(secondary).toBeGreaterThan(-1);
    expect(primary).toBeLessThan(secondary);
    expect(html).toContain('UNIQUE_BODY_MARKER');
    expect(html).toContain('Primary');
    expect(html).toContain('Secondary');
    expect(html).toContain('&rarr;');
  });

  it('renders multiple CTAs in a single row when ctaLayout is row', () => {
    const html = renderCampaignEmail({
      templateId: 'FOLLOW_UP',
      fromAddress: 'updates@mail.noderails.com',
      heading: 'Launch',
      body: 'Body',
      ctaLayout: 'row',
      ctas: [
        {
          id: 'cta-a',
          label: 'One',
          url: 'https://noderails.com/a',
          placement: 'after_body',
          style: 'black_pill',
        },
        {
          id: 'cta-b',
          label: 'Two',
          url: 'https://noderails.com/b',
          placement: 'after_body',
          style: 'outline_dark',
        },
      ],
    });
    expect(html).toContain('One');
    expect(html).toContain('Two');
    expect(html).toContain('padding-right:10px');
    expect(html).toContain('nr-cta-row');
    expect(html).toContain('.nr-cta { display:block !important');
  });

  it('groups CTAs by explicit row numbers', () => {
    const html = renderCampaignEmail({
      templateId: 'FOLLOW_UP',
      fromAddress: 'updates@mail.noderails.com',
      heading: 'Launch',
      body: 'Body',
      ctas: [
        { id: 'a', label: 'A1', url: 'https://noderails.com/a1', placement: 'after_body', style: 'black_pill', row: 1 },
        { id: 'b', label: 'A2', url: 'https://noderails.com/a2', placement: 'after_body', style: 'black_pill', row: 1 },
        { id: 'c', label: 'B1', url: 'https://noderails.com/b1', placement: 'after_body', style: 'black_rect', row: 2 },
        { id: 'd', label: 'C1', url: 'https://noderails.com/c1', placement: 'after_body', style: 'purple_fill', row: 3 },
        { id: 'e', label: 'C2', url: 'https://noderails.com/c2', placement: 'after_body', style: 'purple_fill', row: 3 },
        { id: 'f', label: 'C3', url: 'https://noderails.com/c3', placement: 'after_body', style: 'purple_fill', row: 3 },
      ],
    });
    expect(html).toContain('A1');
    expect(html).toContain('B1');
    expect(html).toContain('C3');
    expect(html.split('nr-cta-row').length - 1).toBe(2);
  });

  it('maps a legacy style id when designer fields are missing', () => {
    const fromStyle = visualFromStyleId('purple_pill');
    expect(fromStyle.shape).toBe('pill');
    expect(fromStyle.bgColor).toBe('#635bff');
    const html = renderCampaignEmail({
      templateId: 'UPDATES',
      fromAddress: 'updates@mail.noderails.com',
      heading: 'Hi',
      body: 'Body',
      ctas: [{
        id: 'legacy-style',
        label: 'Open',
        url: 'https://noderails.com/open',
        placement: 'after_body',
        style: 'purple_pill',
      }],
    });
    expect(html).toContain('border-radius:999px');
    expect(html).toContain('#635bff');
  });

  it('strips unsafe custom CSS and keeps allowlisted declarations', () => {
    expect(sanitizeCampaignCtaCss('background-color:#111111; color:#fff')).toContain('background-color:#111111');
    expect(sanitizeCampaignCtaCss('background:url(https://evil.test/x.png)')).toBe('');
    expect(sanitizeCampaignCtaCss('width:expression(alert(1))')).toBe('');
    expect(sanitizeCampaignCtaCss('position:absolute;color:#000')).toBe('color:#000');
    const html = renderCampaignEmail({
      templateId: 'UPDATES',
      fromAddress: 'updates@mail.noderails.com',
      heading: 'Hi',
      body: 'Body',
      ctas: [{
        id: 'css',
        label: 'Safe',
        url: 'https://noderails.com/safe',
        placement: 'after_body',
        style: 'black_rect',
        customCss: 'font-weight:700; background:url(https://evil.test); expression(alert(1))',
      }],
    });
    expect(html).toContain('font-weight:700');
    expect(html).not.toContain('url(https://evil.test)');
    expect(html).not.toContain('expression(');
  });

  it('drops unsafe icon SVG snapshots', () => {
    expect(sanitizeCampaignCtaSvg('<svg><path d="M1 1"/></svg>')).toContain('<svg');
    expect(sanitizeCampaignCtaSvg('<svg onload="alert(1)"><path d="M1"/></svg>')).toBe('');
    expect(sanitizeCampaignCtaSvg('<svg><script>alert(1)</script></svg>')).toBe('');
  });

  it('places before_signer CTAs above the sign-off on DIRECT_OUTREACH', () => {
    const html = renderCampaignEmail({
      templateId: 'DIRECT_OUTREACH',
      fromAddress: 'business@noderails.com',
      heading: 'Hi',
      body: 'Note',
      signerName: 'Alex',
      ctas: [{
        id: 'cta-s',
        label: 'Reply',
        url: 'https://noderails.com/reply',
        placement: 'before_signer',
        style: 'text_link',
      }],
    });
    const btn = html.indexOf('https://noderails.com/reply');
    const signer = html.indexOf('Alex</div>');
    expect(btn).toBeGreaterThan(-1);
    expect(signer).toBeGreaterThan(btn);
  });
});
