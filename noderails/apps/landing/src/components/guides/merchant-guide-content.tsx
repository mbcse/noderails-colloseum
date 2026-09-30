import { getMerchantGuide, guideImageSrc, type GuideBeat, type GuideTextPart } from './merchant-guide-data';
import { MerchantGuideToc } from './merchant-guide-toc';

function TextParts({ parts }: { parts: GuideTextPart[] }) {
  return (
    <div className="space-y-3.5">
      {parts.map((part, i) => {
        if (part.type === 'p') {
          return (
            <p key={i} className="text-base leading-relaxed text-zinc-800 md:text-[17px]">
              {part.text}
            </p>
          );
        }
        const ListTag = part.type === 'ol' ? 'ol' : 'ul';
        return (
          <ListTag
            key={i}
            className={
              part.type === 'ol'
                ? 'list-decimal space-y-2.5 pl-5 text-base leading-relaxed text-zinc-800 md:text-[17px]'
                : 'list-disc space-y-2.5 pl-5 text-base leading-relaxed text-zinc-800 md:text-[17px]'
            }
          >
            {part.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}

function BeatImages({ images }: { images: string[] }) {
  if (images.length === 0) return null;
  return (
    <div className="space-y-4">
      {images.map((num) => (
        <figure
          key={num}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={guideImageSrc(num)}
            alt={`Guide screenshot ${num}`}
            className="block h-auto w-full"
            loading="lazy"
            decoding="async"
          />
        </figure>
      ))}
    </div>
  );
}

function GuideBeatRow({ beat }: { beat: GuideBeat }) {
  const hasImages = beat.images.length > 0;
  const hasText = beat.text.length > 0;

  if (!hasImages && !hasText) return null;

  if (!hasImages) {
    return (
      <div className="max-w-3xl py-1">
        <TextParts parts={beat.text} />
      </div>
    );
  }

  if (!hasText) {
    return <BeatImages images={beat.images} />;
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-12 xl:gap-10">
      <div className="xl:col-span-8">
        <BeatImages images={beat.images} />
      </div>
      <div className="xl:sticky xl:top-28 xl:col-span-4">
        <TextParts parts={beat.text} />
      </div>
    </div>
  );
}

export function MerchantGuideContent({ variant = 'landing' }: { variant?: 'landing' | 'docs' }) {
  const guide = getMerchantGuide();
  const isDocs = variant === 'docs';
  const tocSteps = guide.steps.map((step) => ({
    id: step.id,
    number: step.number,
    title: step.title,
  }));

  return (
    <div className={isDocs ? undefined : 'w-full'}>
      <header className={isDocs ? 'mb-10' : 'mb-12 max-w-4xl'}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
          Merchant guide
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 md:text-[2.75rem] md:leading-tight">
          {guide.title}
        </h1>
        {guide.intro ? (
          <p className="mt-4 text-lg leading-relaxed text-zinc-700">
            {guide.intro}
          </p>
        ) : null}
      </header>

      <div className={isDocs ? 'space-y-10' : 'lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-10'}>
        {!isDocs ? (
          <aside className="mb-8 hidden lg:col-span-3 lg:mb-0 lg:block">
            <MerchantGuideToc steps={tocSteps} />
          </aside>
        ) : null}

        <div className={isDocs ? 'space-y-10' : 'space-y-10 lg:col-span-9'}>
          {guide.steps.map((step) => (
            <section
              key={step.id}
              id={step.id}
              className="scroll-mt-28 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              <div className="flex items-start gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-5 sm:px-8">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white">
                  {step.number}
                </span>
                <div className="min-w-0 pt-0.5">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
                    {step.title}
                  </h2>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Step {step.number} of {guide.steps.length}
                  </p>
                </div>
              </div>

              <div className="space-y-10 px-5 py-7 sm:px-8 sm:py-10">
                {step.beats.map((beat, i) => (
                  <GuideBeatRow key={`${step.id}-beat-${i}`} beat={beat} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
