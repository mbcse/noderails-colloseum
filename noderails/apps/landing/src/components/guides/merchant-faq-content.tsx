import { getMerchantFaq } from './merchant-guide-data';
import { MerchantFaqAccordion } from './merchant-faq-accordion';

export function MerchantFaqContent({ variant = 'landing' }: { variant?: 'landing' | 'docs' }) {
  const faq = getMerchantFaq();
  const isDocs = variant === 'docs';

  return (
    <div className={isDocs ? undefined : 'mx-auto w-full max-w-4xl'}>
      <header className={isDocs ? 'mb-10' : 'mb-12'}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
          Help
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 md:text-[2.75rem] md:leading-tight">
          {faq.title}
        </h1>
        {faq.intro ? (
          <p className="mt-4 text-lg leading-relaxed text-zinc-700">
            {faq.intro}
          </p>
        ) : null}
      </header>

      <div className="space-y-10">
        {faq.categories.map((category) => (
          <section key={category.title}>
            <h2 className="mb-4 text-xl font-semibold tracking-tight text-zinc-950">
              {category.title}
            </h2>
            <div className={isDocs ? 'not-prose' : undefined}>
              <MerchantFaqAccordion
                items={category.items}
                idPrefix={category.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
