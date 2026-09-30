'use client';

import { useEffect, useRef, useState } from 'react';

export type GuideTocStep = {
  id: string;
  number: number;
  title: string;
};

export function MerchantGuideToc({ steps }: { steps: readonly GuideTocStep[] }) {
  const [activeId, setActiveId] = useState(steps[0]?.id ?? '');
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    if (steps.length === 0) return;

    const updateActive = () => {
      const marker = 140; // under sticky nav
      let current = steps[0].id;
      for (const step of steps) {
        const el = document.getElementById(step.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= marker) current = step.id;
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };

    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateActive);
      window.removeEventListener('resize', updateActive);
    };
  }, [steps]);

  useEffect(() => {
    const link = itemRefs.current[activeId];
    if (!link) return;
    link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeId]);

  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === activeId),
  );
  const progress = steps.length > 0 ? ((activeIndex + 1) / steps.length) * 100 : 0;

  return (
    <nav
      aria-label="Guide steps"
      className="sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:top-24 lg:max-h-[calc(100vh-6.5rem)]"
    >
      <div className="border-b border-zinc-200 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Steps
          </p>
          <p className="text-xs font-semibold tabular-nums text-zinc-700">
            {activeIndex + 1} / {steps.length}
          </p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2.5 text-sm font-semibold leading-snug text-zinc-950">
          {steps[activeIndex]?.title}
        </p>
      </div>

      <ol className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
        {steps.map((step) => {
          const isActive = step.id === activeId;
          return (
            <li key={step.id}>
              <a
                ref={(node) => {
                  itemRefs.current[step.id] = node;
                }}
                href={`#${step.id}`}
                aria-current={isActive ? 'step' : undefined}
                className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-950 ring-1 ring-indigo-100'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  {step.number}
                </span>
                <span className={`leading-snug ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {step.title}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
