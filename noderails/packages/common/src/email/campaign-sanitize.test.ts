import { describe, expect, it } from 'vitest';
import { looksLikeHtml, sanitizeCampaignHtml } from './campaign-sanitize.js';

describe('sanitizeCampaignHtml', () => {
  it('detects HTML bodies', () => {
    expect(looksLikeHtml('<p>Hi</p>')).toBe(true);
    expect(looksLikeHtml('Just text\n\nNext')).toBe(false);
  });

  it('keeps allowlisted markup and images', () => {
    const html = sanitizeCampaignHtml(
      '<p>Hello <strong>there</strong></p><img src="https://noderails.com/a.png" alt="A" /><a href="https://noderails.com">Site</a>',
    );
    expect(html).toContain('<strong>');
    expect(html).toContain('src="https://noderails.com/a.png"');
    expect(html).toContain('href="https://noderails.com"');
    expect(html).toContain('max-width:100%');
  });

  it('strips scripts, handlers, and javascript URLs', () => {
    const html = sanitizeCampaignHtml(
      '<p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="javascript:alert(1)" />',
    );
    expect(html).not.toContain('script');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('Hi');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('<img');
  });

  it('keeps GIFs inline between text', () => {
    const html = sanitizeCampaignHtml(
      '<p>Hello <img src="https://noderails.com/wave.gif" alt="wave" data-nr-gif="1" /> there</p>',
    );
    expect(html).toContain('Hello');
    expect(html).toContain('there');
    expect(html).toContain('src="https://noderails.com/wave.gif"');
    expect(html).toContain('data-nr-gif="1"');
    expect(html).toContain('display:inline');
    expect(html).toContain('width="240"');
    expect(html).not.toContain('display:block;margin:24px auto');
    expect(html).not.toContain('max-height:160px');
  });

  it('treats .gif URLs as inline even without the marker', () => {
    const html = sanitizeCampaignHtml(
      '<p>Hi <img src="https://cdn.example/clip.gif?v=2" alt="" /> ok</p>',
    );
    expect(html).toContain('display:inline');
    expect(html).toContain('data-nr-gif="1"');
  });

  it('applies GIF width and block display', () => {
    const html = sanitizeCampaignHtml(
      '<p><img src="https://noderails.com/big.gif" alt="" data-nr-gif="1" data-nr-display="block" width="448" /></p>',
    );
    expect(html).toContain('width="448"');
    expect(html).toContain('width:448px');
    expect(html).toContain('data-nr-display="block"');
    expect(html).toContain('display:block');
  });
});
