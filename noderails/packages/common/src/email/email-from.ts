export type EmailFromPurpose = 'auth' | 'transactional' | 'campaign';

export const AUTH_FROM_EMAIL_DEFAULT = 'no-reply@noderails.com';
export const TRANSACTIONAL_FROM_EMAIL_DEFAULT = 'transactions@noderails.com';

export const CAMPAIGN_FROM_ADDRESSES = [
  'hello@mail.noderails.com',
  'updates@mail.noderails.com',
  'business@noderails.com',
  'support@noderails.com',
  'security@noderails.com',
] as const;

export type CampaignFromAddress = (typeof CAMPAIGN_FROM_ADDRESSES)[number];

export const DEFAULT_CAMPAIGN_FROM: CampaignFromAddress = 'updates@mail.noderails.com';

const CAMPAIGN_FROM_SET = new Set<string>(CAMPAIGN_FROM_ADDRESSES);

const FROM_DISPLAY_NAME: Record<string, string> = {
  'hello@mail.noderails.com': 'NodeRails',
  'updates@mail.noderails.com': 'NodeRails Updates',
  'business@noderails.com': 'NodeRails Business',
  'support@noderails.com': 'NodeRails Support',
  'security@noderails.com': 'NodeRails Security',
};

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

/** Bare address from `Name <email>` or a raw mailbox. */
export function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return normalizeEmailAddress(match ? match[1] : from);
}

export function emailFromDisplayName(from: string): string {
  const addr = extractEmailAddress(from);
  return FROM_DISPLAY_NAME[addr] ?? 'NodeRails';
}

/** RFC 5322 mailbox used for MIME From and SES FromEmailAddress. */
export function formatFromHeader(from: string): string {
  const addr = extractEmailAddress(from);
  const name = emailFromDisplayName(addr).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${name}" <${addr}>`;
}

export function isAllowedCampaignFrom(from: string): from is CampaignFromAddress {
  return CAMPAIGN_FROM_SET.has(extractEmailAddress(from));
}

export function assertCampaignFrom(from: string): CampaignFromAddress {
  const normalized = extractEmailAddress(from);
  if (!isAllowedCampaignFrom(normalized)) {
    throw new Error(`From address is not allowed for campaigns: ${from}`);
  }
  return normalized;
}

export function campaignEyebrow(from: string): string {
  const normalized = extractEmailAddress(from);
  if (isAllowedCampaignFrom(normalized)) {
    return emailFromDisplayName(normalized);
  }
  return 'NodeRails Updates';
}

export function resolveEmailFrom(
  purpose: EmailFromPurpose,
  addresses: { auth: string; transactional: string },
  campaignFrom?: string,
): string {
  if (purpose === 'auth') return addresses.auth.trim() || AUTH_FROM_EMAIL_DEFAULT;
  if (purpose === 'transactional') {
    return addresses.transactional.trim() || TRANSACTIONAL_FROM_EMAIL_DEFAULT;
  }
  return assertCampaignFrom(campaignFrom ?? DEFAULT_CAMPAIGN_FROM);
}
