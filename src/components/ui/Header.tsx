'use client';

import { MARKETING_CONFIG } from '@/lib/constants';

export default function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="text-xl sm:text-2xl font-bold text-white">
              GLAZE
            </div>
            <div className="text-xs sm:text-sm text-gray-300 break-words leading-relaxed">
              プロフェッショナル カラーグレーディング デモ版
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-auto">
            <div className="text-xs sm:text-sm text-yellow-400">
              デモ版
            </div>
            <button
              onClick={() => window.open(MARKETING_CONFIG.PLUGIN_PURCHASE_URL, '_blank')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-2 text-sm sm:text-base rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg min-h-[44px] touch-manipulation"
            >
              完全版を入手
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}