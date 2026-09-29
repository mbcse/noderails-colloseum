import type { Metadata } from 'next';
import { DocsArticleFrame } from '@/components/docs/docs-article-frame';
import { DocsHeader, DocsSidebar, MobileSidebar } from '@/components/docs/sidebar';

export const metadata: Metadata = {
  title: 'Documentation NodeRails',
  description: 'NodeRails API documentation, SDK guides, and integration reference.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      <DocsHeader />
      <DocsSidebar />
      <main
        className="docs-main"
        style={{
          paddingTop: '57px',
          minHeight: '100vh',
        }}
      >
        <DocsArticleFrame>{children}</DocsArticleFrame>
      </main>
      <MobileSidebar />
    </div>
  );
}
