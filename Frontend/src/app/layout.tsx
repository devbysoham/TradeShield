import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '../components/navigation/Header';
import PageProgress from '../components/navigation/PageProgress';
import IntroLoader from '../components/intro/IntroLoader';
import { RoleProvider } from '../lib/RoleContext';

export const metadata: Metadata = {
  title: 'TradeShield • Cross-Border FX & Trade Treasury',
  description: 'USD/INR 15-day forward forecasting, maritime logistics topology, and trade contract assurance.',
};

export const viewport: Viewport = {
  themeColor: '#1C1A17',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg text-text min-h-screen flex flex-col antialiased">
        <RoleProvider>
          <PageProgress />
          <IntroLoader>
            <Header />
            <main className="flex-1 w-full">
              {children}
            </main>
          </IntroLoader>
        </RoleProvider>
      </body>
    </html>
  );
}
