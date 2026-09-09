import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import TopNavbar from '@/components/TopNavbar';
import PunchGuard from '@/components/PunchGuard';
import ChatWidget from '@/components/ChatWidget';
import ToastContainer from '@/components/ToastContainer';
import { ModalDraftProvider } from '@/context/ModalDraftContext';
import MinimizedModalDock from '@/components/MinimizedModalDock';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TIS Work Tracker',
  description: 'Manage projects, track time across members, and analyze productivity.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ModalDraftProvider>
          <PunchGuard>
            <div className="app-layout">
              <Sidebar />
              <div className="main-wrapper">
                <TopNavbar />
                <main className="main-content">{children}</main>
              </div>
              <ChatWidget />
              <ToastContainer />
              <MinimizedModalDock />
            </div>
          </PunchGuard>
        </ModalDraftProvider>
      </body>
    </html>
  );
}
