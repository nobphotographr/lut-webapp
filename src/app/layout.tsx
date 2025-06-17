import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GLAZE - プロフェッショナル カラーグレーディング デモ版',
  description: '3D LUT技術によるプロフェッショナルなカラーグレーディングを体験してください。GLAZEの強力なPhotoshopプラグインをお試しください。',
  keywords: ['GLAZE', '3D LUT', 'カラーグレーディング', '写真編集', 'photoshop plugin', 'color correction'],
  openGraph: {
    title: 'GLAZE - プロフェッショナル カラーグレーディング',
    description: 'プロ品質のカラーグレーディングをシンプルに',
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
