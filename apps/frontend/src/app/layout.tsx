import type { Metadata } from 'next';
import { TrpcProvider } from '@/lib/trpc-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Workflow Manager',
  description: 'Manage alert workflows with end-to-end type safety',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}
