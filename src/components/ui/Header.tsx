'use client';

import { MARKETING_CONFIG } from '@/lib/constants';

export default function Header() {
  return (
    <header className="bg-glaze-bg-secondary border-b border-glaze-border">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="text-xl sm:text-2xl font-bold text-glaze-text-primary">
              GLAZE
            </div>
            <div className="text-xs sm:text-sm text-glaze-text-muted break-words leading-relaxed">
              プロフェッショナル カラーグレーディング デモ版
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-auto">
            <div className="text-xs sm:text-sm text-yellow-400">
              デモ版
            </div>
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