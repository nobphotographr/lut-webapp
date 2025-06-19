import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://glaze-app.vercel.app'),
  title: 'GLAZE - プロフェッショナル カラーグレーディング デモ版',
  description: '3D LUT技術によるプロフェッショナルなカラーグレーディングを体験してください。GLAZEの強力なPhotoshopプラグインをお試しください。',
  keywords: ['GLAZE', '3D LUT', 'カラーグレーディング', '写真編集', 'photoshop plugin', 'color correction', 'photo editing', 'professional color grading'],
  authors: [{ name: 'GLAZE Team' }],
  creator: 'GLAZE',
  publisher: 'GLAZE',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: '/',
    title: 'GLAZE - プロフェッショナル カラーグレーディング デモ版',
    description: '3D LUT技術によるプロフェッショナルなカラーグレーディングを体験してください。',
    siteName: 'GLAZE',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'GLAZE カラーグレーディング デモ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@glaze_photo',
    creator: '@glaze_photo',
    title: 'GLAZE - プロフェッショナル カラーグレーディング デモ版',
    description: '3D LUT技術によるプロフェッショナルなカラーグレーディングを体験',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
