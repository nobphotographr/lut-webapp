import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '3D LUT Photo Editor - Professional Color Grading Demo',
  description: 'Experience professional color grading with 3D LUT technology. Try our demo and discover our powerful Photoshop plugin.',
  keywords: ['3D LUT', 'color grading', 'photo editing', 'photoshop plugin', 'color correction'],
  openGraph: {
    title: '3D LUT Photo Editor Demo',
    description: 'Professional color grading made easy',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
