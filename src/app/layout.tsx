import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'DealFlow SMS Campaign Manager',
  description: 'SMS Campaign Management & Analytics for DealFlow OH',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
