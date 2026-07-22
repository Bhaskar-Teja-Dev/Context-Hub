import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ContextHub — One Source of Truth for AI Coding Assistants',
  description: 'Shared persistent memory layer for Claude Code, Cursor, Windsurf, ChatGPT and any MCP agent.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px 40px 20px' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
