import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { TeamProvider } from '@/components/providers/TeamProvider';
import PhoneWidgetWrapper from '@/components/phone/PhoneWidgetWrapper';
import { ToastProvider } from '@/components/ui/Toast';
import EmbeddedMessenger from '@/components/messaging/EmbeddedMessenger';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'Фестивалим CRM',
  description: 'CRM система для театрального агентства',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Фестивалим CRM',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#EF4444',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <TeamProvider>
            <ToastProvider>
              <div className="min-h-screen bg-gray-50">
                {children}
              </div>
              <PhoneWidgetWrapper />
              <EmbeddedMessenger />
            </ToastProvider>
          </TeamProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
