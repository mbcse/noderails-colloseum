import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAMPAIGN_FROM,
  assertCampaignFrom,
  campaignEyebrow,
  emailFromDisplayName,
  formatFromHeader,
  isAllowedCampaignFrom,
  resolveEmailFrom,
} from './email-from.js';

describe('campaign from allowlist', () => {
  it('accepts the marketing identities', () => {
    expect(isAllowedCampaignFrom('updates@mail.noderails.com')).toBe(true);
    expect(isAllowedCampaignFrom('Hello@mail.noderails.com')).toBe(true);
    expect(isAllowedCampaignFrom('business@noderails.com')).toBe(true);
    expect(isAllowedCampaignFrom('no-reply@noderails.com')).toBe(false);
  });

  it('rejects unknown campaign From', () => {
    expect(() => assertCampaignFrom('promo@noderails.com')).toThrow(/not allowed/);
  });

  it('resolves purposes', () => {
    expect(resolveEmailFrom('auth', { auth: 'no-reply@noderails.com', transactional: 'transactions@noderails.com' }))
      .toBe('no-reply@noderails.com');
    expect(resolveEmailFrom('transactional', { auth: 'no-reply@noderails.com', transactional: 'transactions@noderails.com' }))
      .toBe('transactions@noderails.com');
    expect(resolveEmailFrom('campaign', { auth: 'a', transactional: 'b' }))
      .toBe(DEFAULT_CAMPAIGN_FROM);
  });

  it('maps eyebrow from From', () => {
    expect(campaignEyebrow('security@noderails.com')).toBe('NodeRails Security');
    expect(campaignEyebrow('hello@mail.noderails.com')).toBe('NodeRails');
    expect(campaignEyebrow('updates@mail.noderails.com')).toBe('NodeRails Updates');
    expect(campaignEyebrow('business@noderails.com')).toBe('NodeRails Business');
  });

  it('formats inbox display names', () => {
    expect(emailFromDisplayName('no-reply@noderails.com')).toBe('NodeRails');
    expect(emailFromDisplayName('transactions@noderails.com')).toBe('NodeRails');
    expect(formatFromHeader('updates@mail.noderails.com'))
      .toBe('"NodeRails Updates" <updates@mail.noderails.com>');
    expect(formatFromHeader('NodeRails <support@noderails.com>'))
      .toBe('"NodeRails Support" <support@noderails.com>');
  });
});
