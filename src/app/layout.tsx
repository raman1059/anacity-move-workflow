import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import './globals.css';

export const metadata: Metadata = {
  title: 'ANACITY — Move-In / Move-Out',
  description: 'Agentic move-in / move-out workflow prototype for ANACITY communities.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
