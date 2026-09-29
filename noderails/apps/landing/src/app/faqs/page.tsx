import type { Metadata } from 'next';
import { MarketingGuideShell } from '@/components/guides/marketing-guide-shell';
import { MerchantFaqContent } from '@/components/guides/merchant-faq-content';

export const metadata: Metadata = {
  title: 'FAQs | NodeRails',
  description:
    'Merchant FAQ for NodeRails crypto payments: onboarding, apps, wallets, settlement, banking, payment links, refunds, subscriptions, invoices, and payouts.',
};

export default function FaqsPage() {
  return (
    <MarketingGuideShell loginLocation="faqs_nav">
      <section className="bg-zinc-50 py-12 lg:py-16">
        <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
          <MerchantFaqContent variant="landing" />
        </div>
      </section>
    </MarketingGuideShell>
  );
}
