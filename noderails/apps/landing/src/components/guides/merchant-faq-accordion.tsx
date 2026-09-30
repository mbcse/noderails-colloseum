'use client';

import { useState } from 'react';
import type { FaqItem } from './merchant-guide-data';

export function MerchantFaqAccordion({
  items,
  idPrefix = 'faq',
}: {
  items: readonly FaqItem[];
  idPrefix?: string;
}) {
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());

  const toggle = (index: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {items.map((item, i) => {
        const isOpen = open.has(i);
        const panelId = `${idPrefix}-${i}`;
        return (
          <div
            key={`${item.question}-${i}`}
            className={i > 0 ? 'border-t border-zinc-200' : undefined}
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full cursor-pointer items-start justify-between gap-4 px-5 py-5 text-left sm:px-7 sm:py-6"
            >
              <span className="text-base font-semibold leading-snug text-zinc-950 sm:text-[17px]">
                {item.question}
              </span>
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-base font-medium text-zinc-700 transition-transform ${
                  isOpen ? 'rotate-45 bg-zinc-100' : ''
                }`}
                aria-hidden
              >
                +
              </span>
            </button>
            <div
              id={panelId}
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-6 text-base leading-relaxed text-zinc-800 sm:px-7 sm:pb-7 sm:text-[17px]">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
