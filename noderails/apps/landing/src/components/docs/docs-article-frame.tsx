'use client';

import { usePathname } from 'next/navigation';

const WIDE_DOCS_PATHS = new Set(['/docs/step-by-step-guide']);

export function DocsArticleFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = WIDE_DOCS_PATHS.has(pathname);

  if (wide) {
    return (
      <div className="min-h-[calc(100vh-57px)] bg-zinc-50">
        <div className="mx-auto w-full max-w-[90rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          {children}
        </div>
      </div>
    );
  }

  return (
    <article
      className="docs-content"
      style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: '40px 32px 80px',
      }}
    >
      {children}
    </article>
  );
}
