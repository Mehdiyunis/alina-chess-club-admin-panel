import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'ALİNA Chess Club Admin Paneli',
  description: 'ALİNA Chess Club üçün təhlükəsiz və müasir idarəetmə paneli (Supabase ilə əlaqə sorğuları, kitablar, müəllimlər və istifadəçilər).',
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: '/assets/aistudio/AL_NA_Chess_Club_Logo_a4cf73aa.png',
    shortcut: '/assets/aistudio/AL_NA_Chess_Club_Logo_a4cf73aa.png',
    apple: '/assets/aistudio/AL_NA_Chess_Club_Logo_a4cf73aa.png',
  },
  openGraph: {
    title: 'ALİNA Chess Club Admin Paneli',
    description: 'ALİNA Chess Club üçün təhlükəsiz və müasir idarəetmə paneli (Supabase ilə əlaqə sorğuları, kitablar, müəllimlər və istifadəçilər).',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/aistudio/AL_NA_Chess_Club_Logo_a4cf73aa.png" />
      </head>
      <body
        className={`${inter.className} bg-[#F7F3EA] text-[#1E2A22] antialiased min-h-screen`}
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
