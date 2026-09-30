import type { Metadata } from 'next';
import { MarketingGuideShell } from '@/components/guides/marketing-guide-shell';
import { MerchantGuideContent } from '@/components/guides/merchant-guide-content';

export const metadata: Metadata = {
  title: 'Step-by-Step Guide | NodeRails',
  description:
    'Walk through merchant onboarding on NodeRails: apps, wallets, settlements, payment links, checkout, refunds, subscriptions, invoices, and disputes.',
};

export default function StepByStepGuidePage() {
  return (
    <MarketingGuideShell loginLocation="step_by_step_guide_nav">
      <section className="bg-zinc-50 py-12 lg:py-16">
        <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
          <MerchantGuideContent variant="landing" />
        </div>
      </section>
    </MarketingGuideShell>
  );
}
