'use client';

import Image from 'next/image';
import { MARKETING_CONFIG } from '@/lib/constants';

export default function Header() {
  return (
    <header className="bg-glaze-secondary border-b border-glaze-border">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center">
              <Image 
                src="/Logo.png" 
                alt="GLAZE Logo" 
                width={120}
                height={40}
                className="h-8 sm:h-10 w-auto"
                priority
              />
            </div>
            <div className="text-xs sm:text-sm text-glaze-text-muted break-words leading-relaxed">
              プロフェッショナル カラーグレーディング
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-auto">
            <button
              onClick={() => window.open(MARKETING_CONFIG.PLUGIN_PURCHASE_URL, '_blank')}
              className="bg-glaze-accent text-white px-4 sm:px-6 py-2 text-sm sm:text-base rounded-md font-semibold hover:bg-glaze-accent-dark transition-all duration-200 shadow-lg min-h-[44px] touch-manipulation"
              style={{ borderRadius: '6px' }}
            >
              完全版を入手
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}