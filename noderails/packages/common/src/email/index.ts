/**
 * @noderails/common — Email utilities
 *
 * SES client, HTML receipt template, and PDF receipt generator.
 */

export { configureSes, sendEmail } from './ses-client.js';
export type { SesConfig, SendEmailInput, EmailAttachment } from './ses-client.js';

export {
  AUTH_FROM_EMAIL_DEFAULT,
  CAMPAIGN_FROM_ADDRESSES,
  DEFAULT_CAMPAIGN_FROM,
  TRANSACTIONAL_FROM_EMAIL_DEFAULT,
  assertCampaignFrom,
  campaignEyebrow,
  emailFromDisplayName,
  extractEmailAddress,
  formatFromHeader,
  isAllowedCampaignFrom,
  normalizeEmailAddress,
  resolveEmailFrom,
} from './email-from.js';
export type { CampaignFromAddress, EmailFromPurpose } from './email-from.js';

export { renderReceiptEmail } from './receipt-template.js';
export type { ReceiptTemplateData } from './receipt-template.js';

export { renderOtpEmail } from './otp-template.js';
export type { OtpTemplateData } from './otp-template.js';

export { generateReceiptPdf } from './receipt-pdf.js';
export type { PdfReceiptData } from './receipt-pdf.js';

export { renderInvoiceEmail } from './invoice-template.js';
export type { InvoiceTemplateData, InvoiceEmailItem } from './invoice-template.js';

export { renderDisputeRaisedEmail, renderDisputeResolvedEmail } from './dispute-template.js';
export type { DisputeRaisedTemplateData, DisputeResolvedTemplateData } from './dispute-template.js';

export { renderPayoutReceivedEmail } from './payout-template.js';
export type { PayoutTemplateData } from './payout-template.js';

export { escapeHtml, extractHttpUrls, isSafeHttpUrl, renderCampaignEmail } from './campaign-template.js';
export type { CampaignTemplateData } from './campaign-template.js';

export {
  CAMPAIGN_CONFIDENTIAL_DISCLAIMER,
  CAMPAIGN_FOOTER_BACKED_BY,
  CAMPAIGN_FOOTER_TAGLINE,
  CAMPAIGN_FOOTER_URLS,
  NODERAILS_FINTECH_DISCLAIMER,
} from './campaign-brand.js';

export {
  CAMPAIGN_CTA_ALIGNS,
  CAMPAIGN_CTA_FILLS,
  CAMPAIGN_CTA_ICON_POSITIONS,
  CAMPAIGN_CTA_LAYOUTS,
  CAMPAIGN_CTA_MAX,
  CAMPAIGN_CTA_PALETTE,
  CAMPAIGN_CTA_PLACEMENTS,
  CAMPAIGN_CTA_SHAPES,
  CAMPAIGN_CTA_STYLE_CATALOG,
  CAMPAIGN_CTA_STYLE_IDS,
  defaultStyleForTemplate,
  isCampaignCtaFill,
  isCampaignCtaLayout,
  isCampaignCtaPlacement,
  isCampaignCtaShape,
  isCampaignCtaStyleId,
  normalizeCampaignCtaInput,
  radiusForShape,
  renderCampaignCtaGroup,
  renderStyledCampaignCta,
  renderStyledCampaignCtaInner,
  sanitizeCampaignCtaCss,
  sanitizeCampaignCtaSvg,
  visualFromStyleId,
} from './campaign-cta-styles.js';
export type {
  CampaignCtaAlign,
  CampaignCtaFill,
  CampaignCtaIconPosition,
  CampaignCtaInput,
  CampaignCtaLayout,
  CampaignCtaPlacement,
  CampaignCtaShape,
  CampaignCtaStyleId,
  CampaignCtaStyleMeta,
} from './campaign-cta-styles.js';

export {
  CAMPAIGN_TEMPLATE_CATALOG,
  DEFAULT_CAMPAIGN_SIGNER_NAME,
  DEFAULT_CAMPAIGN_SIGNER_ORG,
  EMAIL_CAMPAIGN_TEMPLATE_IDS,
  getCampaignTemplateMeta,
  getCampaignTemplateSample,
  isEmailCampaignTemplateId,
  listCampaignTemplateCatalog,
  resolveCampaignSigner,
  resolveCampaignTemplateId,
} from './campaign-template-catalog.js';
export type { CampaignTemplateCategory, CampaignTemplateMeta, CampaignTemplateSample, EmailCampaignTemplateId } from './campaign-template-catalog.js';

export {
  CAMPAIGN_GIF_SIZE_PRESETS,
  CAMPAIGN_GIF_WIDTH_DEFAULT,
  CAMPAIGN_GIF_WIDTH_MAX,
  CAMPAIGN_GIF_WIDTH_MIN,
  campaignGifImgStyle,
  clampCampaignGifWidth,
  looksLikeHtml,
  sanitizeCampaignHtml,
} from './campaign-sanitize.js';
export type { CampaignGifDisplay } from './campaign-sanitize.js';
