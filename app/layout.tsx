import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: 'ATHENA — AI Interview Accelerator',
  description:
    'A personalised, adaptive voice interview that prepares you for the role you are actually facing.',
  openGraph: {
    title: 'ATHENA — AI Interview Accelerator',
    description: 'Prepare for the interview you are actually facing.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ATHENA AI Interview Accelerator' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ATHENA — AI Interview Accelerator',
    description: 'Prepare for the interview you are actually facing.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
