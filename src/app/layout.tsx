import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { TeamProvider } from '@/components/providers/TeamProvider';
import PhoneWidgetWrapper from '@/components/phone/PhoneWidgetWrapper';
import { ToastProvider } from '@/components/ui/Toast';
import EmbeddedMessenger from '@/components/messaging/EmbeddedMessenger';
import { QuickAddButton } from '@/components/clients/QuickAddContact';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.message && (e.message.includes('Loading chunk') || e.message.includes('ChunkLoadError'))) {
                  window.location.reload();
                }
              });
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary moduleName="Приложение">
          <AuthProvider>
            <TeamProvider>
              <ToastProvider>
                <div className="min-h-screen bg-gray-50">
                  {children}
                </div>
                <ErrorBoundary moduleName="Телефония">
                  <PhoneWidgetWrapper />
                </ErrorBoundary>
                <ErrorBoundary moduleName="Мессенджер">
                  <EmbeddedMessenger />
                </ErrorBoundary>
                <ErrorBoundary moduleName="Быстрое добавление">
                  <QuickAddButton />
                </ErrorBoundary>
              </ToastProvider>
            </TeamProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
