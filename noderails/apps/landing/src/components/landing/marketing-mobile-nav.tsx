'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { TrackedLink } from '@/components/tracked-link';
import { PRODUCT_NAV_LINKS } from './product-nav-links';

export type MarketingNavLink = { label: string; href: string };

export const DEFAULT_MARKETING_NAV_LINKS: MarketingNavLink[] = [
  { label: 'Step-by-Step Guide', href: '/step-by-step-guide' },
  { label: 'FAQs', href: '/faqs' },
  { label: 'Developers', href: '/#developers' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Docs', href: '/docs' },
];

type MarketingMobileNavProps = {
  links?: readonly MarketingNavLink[];
  loginHref: string;
  loginLocation: string;
  /** Tailwind top offset so the sheet sits under the current header height. */
  overlayClassName?: string;
};

export function MarketingMobileNav({
  links = DEFAULT_MARKETING_NAV_LINKS,
  loginHref,
  loginLocation,
  overlayClassName = 'top-14 sm:top-16',
}: MarketingMobileNavProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <div className={`fixed inset-0 z-[60] ${overlayClassName}`}>
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close navigation overlay"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 top-0 max-h-[min(80dvh,640px)] overflow-y-auto border-b border-slate-200 bg-white px-4 py-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Products</p>
            <ul className="mt-2 space-y-0.5">
              {PRODUCT_NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="block rounded-lg px-2 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">More</p>
            <ul className="mt-2 space-y-0.5">
              {links.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  <a
                    href={item.href}
                    className="block rounded-lg px-2 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <TrackedLink
              href={loginHref}
              event="landing_login_clicked"
              properties={{ location: loginLocation }}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Merchant Login
            </TrackedLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}
